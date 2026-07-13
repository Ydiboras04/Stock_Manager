"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isBelowThreshold, computeReorderQuantity } from "@/lib/business/reorder";
import { createNotification } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

const OPEN_STATUSES = ["PENDING_VALIDATION", "VALIDATED", "SENT"] as const;

export async function listOpenPurchaseOrdersForProduct(tx: TransactionClient, productId: string) {
  return tx.purchaseOrderLine.findFirst({
    where: {
      productId,
      purchaseOrder: { status: { in: [...OPEN_STATUSES] } },
    },
  });
}

export async function checkAndTriggerReorder(tx: TransactionClient, productId: string) {
  const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });

  if (!isBelowThreshold(product.quantity, product.qMin)) return;

  const existingOpenOrder = await listOpenPurchaseOrdersForProduct(tx, productId);
  if (existingOpenOrder) return;

  const reorderQuantity = computeReorderQuantity(product.quantity, product.qMin);

  const purchaseOrder = await tx.purchaseOrder.create({
    data: {
      supplierId: product.supplierId,
      status: "PENDING_VALIDATION",
      lines: { create: [{ productId: product.id, quantity: reorderQuantity }] },
    },
  });

  await createNotification(
    {
      role: "RESPONSABLE_ACHATS",
      type: "PURCHASE_ORDER_TO_VALIDATE",
      message: `Commande fournisseur à valider pour ${product.name} (quantité: ${reorderQuantity})`,
      relatedEntityId: purchaseOrder.id,
    },
    tx
  );
}

export async function listPendingPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    where: { status: "PENDING_VALIDATION" },
    include: { supplier: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    include: { supplier: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function validatePurchaseOrder(id: string, validatedById: string) {
  try {
    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "VALIDATED", validatedById },
    });
    revalidatePath("/commandes-fournisseurs");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erreur lors de la validation de la commande",
    };
  }
}

export async function rejectPurchaseOrder(id: string, validatedById: string) {
  try {
    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "REJECTED", validatedById },
    });
    revalidatePath("/commandes-fournisseurs");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erreur lors du rejet de la commande",
    };
  }
}

export async function emitPurchaseOrder(id: string) {
  try {
    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "SENT" },
      include: { supplier: true },
    });

    await createNotification({
      role: "GESTIONNAIRE_STOCK",
      type: "PURCHASE_ORDER_SENT",
      message: `Commande envoyée à ${order.supplier.name}, en attente de livraison`,
      relatedEntityId: order.id,
    });

    revalidatePath("/commandes-fournisseurs");
    revalidatePath("/reception-livraison");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erreur lors de l'émission de la commande",
    };
  }
}
