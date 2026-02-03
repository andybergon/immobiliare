import { describe, it, expect } from "bun:test";
import { parseCount, parseFloor, parseNumber } from "./parsing";

describe("parseNumber", () => {
  it("returns numbers", () => {
    expect(parseNumber(10)).toBe(10);
    expect(parseNumber(0)).toBe(0);
  });

  it("parses digits from strings", () => {
    expect(parseNumber("123")).toBe(123);
    expect(parseNumber("350 m²")).toBe(350);
    expect(parseNumber("€ 450.000")).toBe(450);
  });

  it("returns null when no digits", () => {
    expect(parseNumber("N/A")).toBeNull();
    expect(parseNumber(" ")).toBeNull();
  });
});

describe("parseCount", () => {
  it("returns nulls for empty", () => {
    expect(parseCount(undefined)).toEqual({ value: null, raw: null });
    expect(parseCount(null)).toEqual({ value: null, raw: null });
    expect(parseCount("")).toEqual({ value: null, raw: null });
  });

  it("parses numbers", () => {
    expect(parseCount(5)).toEqual({ value: 5, raw: null });
    expect(parseCount("5")).toEqual({ value: 5, raw: null });
  });

  it("handles plus counts", () => {
    expect(parseCount("5+")).toEqual({ value: 5, raw: "5+" });
    expect(parseCount("5 +")).toEqual({ value: 5, raw: "5+" });
  });

  it("keeps raw when string contains extra text", () => {
    expect(parseCount("5 locali")).toEqual({ value: 5, raw: "5 locali" });
    expect(parseCount("locali"))
      .toEqual({ value: null, raw: "locali" });
  });
});

describe("parseFloor", () => {
  it("parses numeric floors", () => {
    expect(parseFloor(3)).toEqual({ value: 3, raw: null });
    expect(parseFloor("-1")).toEqual({ value: -1, raw: null });
    expect(parseFloor("0")).toEqual({ value: 0, raw: null });
  });

  it("keeps raw for non-numeric floors", () => {
    expect(parseFloor("R")).toEqual({ value: null, raw: "R" });
    expect(parseFloor("T")).toEqual({ value: null, raw: "T" });
  });

  it("returns nulls for empty", () => {
    expect(parseFloor(undefined)).toEqual({ value: null, raw: null });
    expect(parseFloor(" ")).toEqual({ value: null, raw: null });
  });
});
