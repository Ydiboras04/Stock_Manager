import { describe, it, expect } from "vitest";
import { isStockSufficient, getInsufficientProductIds } from "./availability";

describe("isStockSufficient", () => {
  it("returns true when available quantity covers requested quantity for every line", () => {
    const result = isStockSufficient([
      { productId: "p1", requestedQuantity: 5, availableQuantity: 10 },
      { productId: "p2", requestedQuantity: 2, availableQuantity: 2 },
    ]);
    expect(result).toBe(true);
  });

  it("returns false when at least one line lacks stock", () => {
    const result = isStockSufficient([
      { productId: "p1", requestedQuantity: 5, availableQuantity: 10 },
      { productId: "p2", requestedQuantity: 3, availableQuantity: 2 },
    ]);
    expect(result).toBe(false);
  });
});

describe("getInsufficientProductIds", () => {
  it("returns the ids of lines lacking stock only", () => {
    const result = getInsufficientProductIds([
      { productId: "p1", requestedQuantity: 5, availableQuantity: 10 },
      { productId: "p2", requestedQuantity: 3, availableQuantity: 2 },
    ]);
    expect(result).toEqual(["p2"]);
  });
});
