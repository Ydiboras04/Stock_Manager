export interface InvoiceLineInput {
  quantity: number;
  unitPriceCents: number;
}

export interface InvoiceTotals {
  subtotalCents: number;
  tvaCents: number;
  totalCents: number;
}

const TVA_RATE = 0.2;

export function computeInvoiceTotals(lines: InvoiceLineInput[]): InvoiceTotals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const tvaCents = Math.round(subtotalCents * TVA_RATE);
  return { subtotalCents, tvaCents, totalCents: subtotalCents + tvaCents };
}

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `FA-${year}-${String(sequence).padStart(4, "0")}`;
}
