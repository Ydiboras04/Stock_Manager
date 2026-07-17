import { describe, it, expect } from "vitest";
import { computeInvoiceTotals, formatInvoiceNumber } from "./invoice";

describe("computeInvoiceTotals", () => {
  it("computes subtotal, 20% TVA, and total for a single line", () => {
    const result = computeInvoiceTotals([{ quantity: 2, unitPriceCents: 1000 }]);
    expect(result).toEqual({ subtotalCents: 2000, tvaCents: 400, totalCents: 2400 });
  });

  it("sums multiple lines before computing TVA", () => {
    const result = computeInvoiceTotals([
      { quantity: 1, unitPriceCents: 4500 },
      { quantity: 3, unitPriceCents: 1990 },
    ]);
    // subtotal = 4500 + 5970 = 10470; tva = round(10470 * 0.20) = 2094; total = 12564
    expect(result).toEqual({ subtotalCents: 10470, tvaCents: 2094, totalCents: 12564 });
  });

  it("returns zeros for an empty line list", () => {
    expect(computeInvoiceTotals([])).toEqual({ subtotalCents: 0, tvaCents: 0, totalCents: 0 });
  });

  it("rounds TVA to the nearest cent", () => {
    // subtotal = 999 -> tva = 999 * 0.20 = 199.8 -> rounds to 200
    const result = computeInvoiceTotals([{ quantity: 1, unitPriceCents: 999 }]);
    expect(result.tvaCents).toBe(200);
    expect(result.totalCents).toBe(1199);
  });
});

describe("formatInvoiceNumber", () => {
  it("pads the sequence to 4 digits", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("FA-2026-0001");
    expect(formatInvoiceNumber(2026, 42)).toBe("FA-2026-0042");
  });

  it("does not truncate a sequence longer than 4 digits", () => {
    expect(formatInvoiceNumber(2026, 12345)).toBe("FA-2026-12345");
  });
});
