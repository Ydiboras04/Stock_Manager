import { describe, it, expect } from "vitest";
import { isDeliveryConform } from "./conformity";

describe("isDeliveryConform", () => {
  it("returns true when all received quantities match ordered quantities", () => {
    const result = isDeliveryConform([
      { productId: "p1", orderedQuantity: 10, receivedQuantity: 10 },
      { productId: "p2", orderedQuantity: 5, receivedQuantity: 5 },
    ]);
    expect(result).toBe(true);
  });

  it("returns false when any received quantity differs from ordered quantity", () => {
    const result = isDeliveryConform([
      { productId: "p1", orderedQuantity: 10, receivedQuantity: 10 },
      { productId: "p2", orderedQuantity: 5, receivedQuantity: 3 },
    ]);
    expect(result).toBe(false);
  });

  it("returns true for an empty list", () => {
    expect(isDeliveryConform([])).toBe(true);
  });
});
