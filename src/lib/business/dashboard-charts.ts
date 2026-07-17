export interface InvoiceForChart {
  type: "SALE" | "PURCHASE";
  issuedAt: Date;
  totalCents: number;
}

export interface RevenuePoint {
  date: string;
  salesCents: number;
  purchasesCents: number;
}

export function buildRevenueSeries(invoices: InvoiceForChart[]): RevenuePoint[] {
  const byDate = new Map<string, { salesCents: number; purchasesCents: number }>();

  for (const invoice of invoices) {
    const date = invoice.issuedAt.toISOString().slice(0, 10);
    const entry = byDate.get(date) ?? { salesCents: 0, purchasesCents: 0 };
    if (invoice.type === "SALE") {
      entry.salesCents += invoice.totalCents;
    } else {
      entry.purchasesCents += invoice.totalCents;
    }
    byDate.set(date, entry);
  }

  return Array.from(byDate.entries())
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
