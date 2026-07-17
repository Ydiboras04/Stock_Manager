import { describe, it, expect } from "vitest";
import { buildRevenueSeries, type InvoiceForChart } from "./dashboard-charts";

describe("buildRevenueSeries", () => {
  it("returns an empty array for no invoices", () => {
    expect(buildRevenueSeries([])).toEqual([]);
  });

  it("buckets a single sale invoice by its issued date", () => {
    const invoices: InvoiceForChart[] = [
      { type: "SALE", issuedAt: new Date("2026-07-15T10:00:00Z"), totalCents: 10800 },
    ];
    expect(buildRevenueSeries(invoices)).toEqual([
      { date: "2026-07-15", salesCents: 10800, purchasesCents: 0 },
    ]);
  });

  it("sums multiple invoices of the same type on the same day", () => {
    const invoices: InvoiceForChart[] = [
      { type: "SALE", issuedAt: new Date("2026-07-15T08:00:00Z"), totalCents: 10800 },
      { type: "SALE", issuedAt: new Date("2026-07-15T14:00:00Z"), totalCents: 2400 },
    ];
    expect(buildRevenueSeries(invoices)).toEqual([
      { date: "2026-07-15", salesCents: 13200, purchasesCents: 0 },
    ]);
  });

  it("keeps sale and purchase totals separate on the same day", () => {
    const invoices: InvoiceForChart[] = [
      { type: "SALE", issuedAt: new Date("2026-07-15T08:00:00Z"), totalCents: 10800 },
      { type: "PURCHASE", issuedAt: new Date("2026-07-15T09:00:00Z"), totalCents: 11940 },
    ];
    expect(buildRevenueSeries(invoices)).toEqual([
      { date: "2026-07-15", salesCents: 10800, purchasesCents: 11940 },
    ]);
  });

  it("sorts multiple days chronologically regardless of input order", () => {
    const invoices: InvoiceForChart[] = [
      { type: "SALE", issuedAt: new Date("2026-07-17T08:00:00Z"), totalCents: 5000 },
      { type: "SALE", issuedAt: new Date("2026-07-15T08:00:00Z"), totalCents: 3000 },
      { type: "PURCHASE", issuedAt: new Date("2026-07-16T08:00:00Z"), totalCents: 4000 },
    ];
    expect(buildRevenueSeries(invoices)).toEqual([
      { date: "2026-07-15", salesCents: 3000, purchasesCents: 0 },
      { date: "2026-07-16", salesCents: 0, purchasesCents: 4000 },
      { date: "2026-07-17", salesCents: 5000, purchasesCents: 0 },
    ]);
  });
});
