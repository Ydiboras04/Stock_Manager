export interface OrderLineRequest {
  productId: string;
  requestedQuantity: number;
  availableQuantity: number;
}

export function isStockSufficient(lines: OrderLineRequest[]): boolean {
  return lines.every((line) => line.availableQuantity >= line.requestedQuantity);
}

export function getInsufficientProductIds(lines: OrderLineRequest[]): string[] {
  return lines
    .filter((line) => line.availableQuantity < line.requestedQuantity)
    .map((line) => line.productId);
}
