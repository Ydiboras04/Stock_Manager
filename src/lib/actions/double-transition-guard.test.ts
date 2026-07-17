import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Integration test: exercises the real Prisma client against the local
// SQLite dev database (same file used by `npm run dev` / seed scripts).
// DATABASE_URL must be set before `@/lib/prisma` is imported, since the
// generated Prisma client reads it at construction time.
import path from "node:path";

process.env.DATABASE_URL ??= `file:${path.resolve(__dirname, "../../../prisma/dev.db")}`;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { markCustomerOrderShipped } = await import("@/lib/actions/customer-orders");
const { receiveDelivery } = await import("@/lib/actions/delivery");

describe("double-invocation guards against re-transitioning an already-processed order", () => {
  let supplierId: string;
  let clientId: string;

  beforeAll(async () => {
    const supplier = await prisma.supplier.create({
      data: { name: "Test Supplier (double-transition test)", email: "double-transition@test.local", phone: "0000000000" },
    });
    supplierId = supplier.id;

    const client = await prisma.client.create({
      data: { name: "Client test (double-transition test)", email: "doubletransitionclient@test.local" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    const orders = await prisma.customerOrder.findMany({ where: { clientId }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);
    const purchaseOrders = await prisma.purchaseOrder.findMany({ where: { supplierId }, select: { id: true } });
    const poIds = purchaseOrders.map((p) => p.id);

    const invoiceIds = (
      await prisma.invoice.findMany({
        where: { OR: [{ customerOrderId: { in: orderIds } }, { purchaseOrderId: { in: poIds } }] },
        select: { id: true },
      })
    ).map((i) => i.id);
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    await prisma.stockMovement.deleteMany({ where: { product: { supplierId } } });
    await prisma.customerOrderLine.deleteMany({ where: { customerOrderId: { in: orderIds } } });
    await prisma.customerOrder.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
    await prisma.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
    await prisma.product.deleteMany({ where: { supplierId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.supplier.delete({ where: { id: supplierId } });
  });

  it("markCustomerOrderShipped only creates one invoice and rejects the second call", async () => {
    const product = await prisma.product.create({
      data: { sku: `SHIP-GUARD-${Date.now()}`, name: "Produit test guard shipped", quantity: 10, qMin: 0, unitPriceCents: 1000, supplierId },
    });

    const order = await prisma.customerOrder.create({
      data: {
        clientId,
        status: "RESERVED",
        lines: { create: [{ productId: product.id, quantity: 2 }] },
      },
    });

    const first = await markCustomerOrderShipped(order.id);
    expect(first.success).toBe(true);

    const second = await markCustomerOrderShipped(order.id);
    expect(second.success).toBe(false);

    const invoiceCount = await prisma.invoice.count({ where: { customerOrderId: order.id } });
    expect(invoiceCount).toBe(1);

    const finalOrder = await prisma.customerOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(finalOrder.status).toBe("SHIPPED");
  });

  it("receiveDelivery only creates one invoice, increments stock once, and rejects the second call", async () => {
    const product = await prisma.product.create({
      data: { sku: `RECV-GUARD-${Date.now()}`, name: "Produit test guard delivery", quantity: 5, qMin: 0, unitPriceCents: 1000, supplierId },
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        status: "SENT",
        lines: { create: [{ productId: product.id, quantity: 4 }] },
      },
      include: { lines: true },
    });
    const lineId = po.lines[0].id;

    const first = await receiveDelivery(po.id, { [lineId]: 4 });
    expect(first.success).toBe(true);

    const second = await receiveDelivery(po.id, { [lineId]: 4 });
    expect(second.success).toBe(false);

    const invoiceCount = await prisma.invoice.count({ where: { purchaseOrderId: po.id } });
    expect(invoiceCount).toBe(1);

    const finalProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(finalProduct.quantity).toBe(9); // 5 + 4, incremented only once

    const finalPo = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    expect(finalPo.status).toBe("DELIVERED");
  });
});
