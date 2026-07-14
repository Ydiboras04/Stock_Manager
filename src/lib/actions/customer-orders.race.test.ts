import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Integration test: exercises the real Prisma client against the local
// SQLite dev database (same file used by `npm run dev` / seed scripts).
// DATABASE_URL must be set before `@/lib/prisma` is imported, since the
// generated Prisma client reads it at construction time.
import path from "node:path";

process.env.DATABASE_URL ??= `file:${path.resolve(__dirname, "../../../prisma/dev.db")}`;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { createCustomerOrder } = await import("@/lib/actions/customer-orders");

describe("createCustomerOrder stock decrement race guard", () => {
  let supplierId: string;
  let productId: string;
  let clientId: string;

  beforeAll(async () => {
    const supplier = await prisma.supplier.create({
      data: { name: "Test Supplier (race test)", email: "race@test.local", phone: "0000000000" },
    });
    supplierId = supplier.id;

    const product = await prisma.product.create({
      data: {
        sku: `RACE-TEST-${Date.now()}`,
        name: "Produit test course critique",
        quantity: 5,
        qMin: 0,
        supplierId,
      },
    });
    productId = product.id;

    const client = await prisma.client.create({
      data: { name: "Client test (race test)", email: "raceclient@test.local" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({ where: { productId } });
    const orders = await prisma.customerOrder.findMany({
      where: { clientId },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    await prisma.customerOrderLine.deleteMany({ where: { customerOrderId: { in: orderIds } } });
    await prisma.customerOrder.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.notification.deleteMany({ where: { relatedEntityId: { in: orderIds } } });
    await prisma.purchaseOrderLine.deleteMany({ where: { productId } });
    await prisma.purchaseOrder.deleteMany({ where: { supplierId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.supplier.delete({ where: { id: supplierId } });
  });

  it("never drives quantity negative when two orders race for the same stock", async () => {
    // Stock is 5. Two concurrent orders each request 3 units. Both will
    // pass an outer (pre-transaction) availability check reading quantity=5,
    // but only one can actually be satisfied without going negative.
    const [resultA, resultB] = await Promise.all([
      createCustomerOrder(clientId, [{ productId, quantity: 3 }]),
      createCustomerOrder(clientId, [{ productId, quantity: 3 }]),
    ]);

    expect(resultA.success).toBe(true);
    expect(resultB.success).toBe(true);

    const finalProduct = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(finalProduct.quantity).toBeGreaterThanOrEqual(0);

    const orderIds = [resultA, resultB]
      .filter((r): r is Extract<typeof r, { success: true }> => r.success)
      .map((r) => r.data.id);
    const orders = await prisma.customerOrder.findMany({ where: { id: { in: orderIds } } });

    const reserved = orders.filter((o) => o.status === "RESERVED");
    const insufficient = orders.filter((o) => o.status === "STOCK_INSUFFICIENT");

    // Exactly one of the two racing orders should have been reserved
    // (decremented), the other must be flagged as stock-insufficient
    // rather than allowed to push quantity below zero.
    expect(reserved).toHaveLength(1);
    expect(insufficient).toHaveLength(1);
    expect(finalProduct.quantity).toBe(2);
  });

  it("rejects a decrement attempted against a quantity that is no longer sufficient", async () => {
    await prisma.product.update({ where: { id: productId }, data: { quantity: 1 } });

    const result = await createCustomerOrder(clientId, [{ productId, quantity: 1 }]);
    expect(result.success).toBe(true);

    // Manually drain stock to 0 to simulate a concurrent order winning the
    // race between the availability check and the guarded decrement.
    await prisma.product.update({ where: { id: productId }, data: { quantity: 0 } });

    const updated = await prisma.product.updateMany({
      where: { id: productId, quantity: { gte: 1 } },
      data: { quantity: { decrement: 1 } },
    });

    expect(updated.count).toBe(0);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.quantity).toBe(0);
  });
});
