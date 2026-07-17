"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isDeliveryConform, type ReceivedLine } from "@/lib/business/conformity";
import { createNotification } from "@/lib/notifications";
import { createInvoiceForPurchaseOrder } from "@/lib/actions/invoices";

class PurchaseOrderNoLongerSentError extends Error {
  constructor(readonly purchaseOrderId: string) {
    super("Cette commande n'est plus au statut envoyée");
  }
}

export async function listSentPurchaseOrders() {
  try {
    return await prisma.purchaseOrder.findMany({
      where: { status: "SENT" },
      include: { supplier: true, lines: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return [];
  }
}

export async function receiveDelivery(purchaseOrderId: string, receivedQuantities: Record<string, number>) {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { supplier: true, lines: { include: { product: true } } },
    });
    if (!order) return { success: false as const, error: "Commande introuvable" };
    if (order.status !== "SENT") {
      return { success: false as const, error: "Cette commande n'est plus au statut envoyée" };
    }

    const receivedLines: ReceivedLine[] = order.lines.map((line) => ({
      productId: line.productId,
      orderedQuantity: line.quantity,
      receivedQuantity: receivedQuantities[line.id] ?? 0,
    }));

    const conform = isDeliveryConform(receivedLines);

    if (!conform) {
      const report = order.lines
        .map((line) => `${line.product.name}: attendu ${line.quantity}, reçu ${receivedQuantities[line.id] ?? 0}`)
        .join("; ");

      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: "REJECTED", nonConformityReport: report },
      });

      await createNotification({
        role: "RESPONSABLE_ACHATS",
        type: "NON_CONFORMITY",
        message: `Livraison non conforme pour la commande #${purchaseOrderId.slice(-6)}`,
        relatedEntityId: purchaseOrderId,
      });

      revalidatePath("/reception-livraison");
      return { success: true as const, conform: false };
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Re-check status inside the transaction to guard against a
        // concurrent call transitioning the order between the outer
        // pre-check and this write (TOCTOU race). Checked first so a
        // failed guard avoids the stock increments below.
        const updated = await tx.purchaseOrder.updateMany({
          where: { id: purchaseOrderId, status: "SENT" },
          data: { status: "DELIVERED" },
        });
        if (updated.count === 0) {
          throw new PurchaseOrderNoLongerSentError(purchaseOrderId);
        }

        for (const line of order.lines) {
          await tx.product.update({
            where: { id: line.productId },
            data: { quantity: { increment: line.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: line.productId,
              quantity: line.quantity,
              type: "IN",
              reason: "DELIVERY",
              relatedOrderId: purchaseOrderId,
            },
          });
        }
        await createInvoiceForPurchaseOrder(tx, order);
      });
    } catch (err) {
      if (err instanceof PurchaseOrderNoLongerSentError) {
        return { success: false as const, error: "Cette commande n'est plus au statut envoyée" };
      }
      throw err;
    }

    await createNotification({
      role: "RESPONSABLE_ACHATS",
      type: "ACCOUNTING_VALIDATION",
      message: `Livraison conforme reçue pour la commande #${purchaseOrderId.slice(-6)}, validation comptable à effectuer`,
      relatedEntityId: purchaseOrderId,
    });

    revalidatePath("/reception-livraison");
    revalidatePath("/catalogue/produits");
    revalidatePath("/factures");
    return { success: true as const, conform: true };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erreur lors de la réception de la livraison",
    };
  }
}
