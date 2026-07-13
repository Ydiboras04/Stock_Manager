import { describe, it, expect } from "vitest";
import { isBelowThreshold, computeReorderQuantity } from "./reorder";

describe("isBelowThreshold", () => {
  it("returns true when quantity is strictly below qMin", () => {
    expect(isBelowThreshold(4, 10)).toBe(true);
  });

  it("returns false when quantity equals or exceeds qMin", () => {
    expect(isBelowThreshold(10, 10)).toBe(false);
    expect(isBelowThreshold(15, 10)).toBe(false);
  });
});

describe("computeReorderQuantity", () => {
  it("computes qMin * 2 - quantity when positive", () => {
    expect(computeReorderQuantity(4, 10)).toBe(16);
  });

  it("falls back to qMin when the formula would be zero or negative", () => {
    expect(computeReorderQuantity(20, 10)).toBe(10);
  });
});
