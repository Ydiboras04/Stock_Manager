export interface ReceivedLine {
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
}

export function isDeliveryConform(lines: ReceivedLine[]): boolean {
  return lines.every((line) => line.receivedQuantity === line.orderedQuantity);
}
