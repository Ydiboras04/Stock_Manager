"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { computeInvoiceTotals, formatInvoiceNumber } from "@/lib/business/invoice";

type TransactionClient = Prisma.TransactionClient;

interface InvoiceLineSource {
  quantity: number;
  product: { name: string; sku: string; unitPriceCents: number };
}

export interface CustomerOrderForInvoice {
  id: string;
  client: { name: string };
  lines: InvoiceLineSource[];
}

export interface PurchaseOrderForInvoice {
  id: string;
  supplier: { name: string };
  lines: InvoiceLineSource[];
}

async function nextInvoiceNumber(tx: TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.invoice.count({ where: { number: { startsWith: `FA-${year}-` } } });
  return formatInvoiceNumber(year, count + 1);
}

async function createInvoice(
  tx: TransactionClient,
  input: {
    type: "SALE" | "PURCHASE";
    customerOrderId?: string;
    purchaseOrderId?: string;
    partyName: string;
    lines: InvoiceLineSource[];
  }
) {
  const totals = computeInvoiceTotals(
    input.lines.map((l) => ({ quantity: l.quantity, unitPriceCents: l.product.unitPriceCents }))
  );
  const number = await nextInvoiceNumber(tx);

  await tx.invoice.create({
    data: {
      number,
      type: input.type,
      customerOrderId: input.customerOrderId,
      purchaseOrderId: input.purchaseOrderId,
      partyName: input.partyName,
      subtotalCents: totals.subtotalCents,
      tvaCents: totals.tvaCents,
      totalCents: totals.totalCents,
      lines: {
        create: input.lines.map((l) => ({
          productName: l.product.name,
          productSku: l.product.sku,
          quantity: l.quantity,
          unitPriceCents: l.product.unitPriceCents,
          lineTotalCents: l.quantity * l.product.unitPriceCents,
        })),
      },
    },
  });
}

export async function createInvoiceForCustomerOrder(tx: TransactionClient, order: CustomerOrderForInvoice) {
  await createInvoice(tx, {
    type: "SALE",
    customerOrderId: order.id,
    partyName: order.client.name,
    lines: order.lines,
  });
}

export async function createInvoiceForPurchaseOrder(tx: TransactionClient, order: PurchaseOrderForInvoice) {
  await createInvoice(tx, {
    type: "PURCHASE",
    purchaseOrderId: order.id,
    partyName: order.supplier.name,
    lines: order.lines,
  });
}

export async function listInvoices() {
  try {
    return await prisma.invoice.findMany({ orderBy: { issuedAt: "desc" } });
  } catch {
    return [];
  }
}
