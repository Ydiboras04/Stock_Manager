export function isBelowThreshold(quantity: number, qMin: number): boolean {
  return quantity < qMin;
}

export function computeReorderQuantity(quantity: number, qMin: number): number {
  const target = qMin * 2 - quantity;
  return target > 0 ? target : qMin;
}
