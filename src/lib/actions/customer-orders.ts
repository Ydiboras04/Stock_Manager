"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isStockSufficient, getInsufficientProductIds, type OrderLineRequest } from "@/lib/business/availability";
import { checkAndTriggerReorder } from "@/lib/actions/purchase-orders";
import { createNotification } from "@/lib/notifications";

export interface OrderLineInput {
  productId: string;
  quantity: number;
}

export async function createCustomerOrder(clientId: string, lines: OrderLineInput[]) {
  if (!clientId || lines.length === 0) {
    return { success: false as const, error: "Client et au moins une ligne sont requis" };
  }

  try {
    const products = await prisma.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
    });

    const availabilityInput: OrderLineRequest[] = lines.map((line) => {
      const product = products.find((p) => p.id === line.productId)!;
      return { productId: line.productId, requestedQuantity: line.quantity, availableQuantity: product.quantity };
    });

    const sufficient = isStockSufficient(availabilityInput);

    const order = await prisma.customerOrder.create({
      data: {
        clientId,
        status: sufficient ? "RESERVED" : "STOCK_INSUFFICIENT",
        lines: { create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) },
      },
    });

    if (!sufficient) {
      const insufficientIds = getInsufficientProductIds(availabilityInput);
      await createNotification({
        role: "GESTIONNAIRE_STOCK",
        type: "STOCK_INSUFFICIENT",
        message: `Stock insuffisant pour la commande #${order.id.slice(-6)}`,
        relatedEntityId: order.id,
      });
      await createNotification({
        role: "RESPONSABLE_ACHATS",
        type: "STOCK_INSUFFICIENT",
        message: `Stock insuffisant pour la commande #${order.id.slice(-6)}`,
        relatedEntityId: order.id,
      });

      for (const productId of insufficientIds) {
        await prisma.$transaction((tx) => checkAndTriggerReorder(tx, productId));
      }

      revalidatePath("/commandes-clients");
      return { success: true as const, data: order };
    }

    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { quantity: { decrement: line.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            quantity: line.quantity,
            type: "OUT",
            reason: "CUSTOMER_ORDER",
            relatedOrderId: order.id,
          },
        });
        await checkAndTriggerReorder(tx, line.productId);
      }
    });

    revalidatePath("/commandes-clients");
    revalidatePath("/catalogue/produits");
    revalidatePath("/preparation-colis");
    return { success: true as const, data: order };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erreur lors de la création de la commande",
    };
  }
}

export async function listCustomerOrders() {
  try {
    return await prisma.customerOrder.findMany({
      include: { client: true, lines: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export async function listReservedCustomerOrders() {
  try {
    return await prisma.customerOrder.findMany({
      where: { status: "RESERVED" },
      include: { client: true, lines: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return [];
  }
}

export async function markCustomerOrderShipped(id: string) {
  try {
    await prisma.customerOrder.update({ where: { id }, data: { status: "SHIPPED" } });
    revalidatePath("/preparation-colis");
    revalidatePath("/commandes-clients");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erreur lors du marquage de la commande",
    };
  }
}
