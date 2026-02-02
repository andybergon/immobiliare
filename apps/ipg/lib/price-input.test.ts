import { describe, it, expect } from "bun:test";
import {
  formatWithThousands,
  formatInputValue,
  getSuffixZeros,
  getValue,
  parseInput,
} from "./price-input";

describe("formatWithThousands", () => {
  it("formats small numbers without separators", () => {
    expect(formatWithThousands(100)).toBe("100");
    expect(formatWithThousands(999)).toBe("999");
  });

  it("formats thousands with dot separator", () => {
    expect(formatWithThousands(1000)).toBe("1.000");
    expect(formatWithThousands(10000)).toBe("10.000");
    expect(formatWithThousands(100000)).toBe("100.000");
    expect(formatWithThousands(350000)).toBe("350.000");
    expect(formatWithThousands(350500)).toBe("350.500");
  });

  it("formats millions with multiple separators", () => {
    expect(formatWithThousands(1000000)).toBe("1.000.000");
    expect(formatWithThousands(1500000)).toBe("1.500.000");
    expect(formatWithThousands(12345678)).toBe("12.345.678");
  });
});

describe("getValue", () => {
  it("returns 0 for empty string", () => {
    expect(getValue("")).toBe(0);
  });

  it("multiplies 1-3 digits by 1000", () => {
    expect(getValue("3")).toBe(3000);
    expect(getValue("35")).toBe(35000);
    expect(getValue("350")).toBe(350000);
  });

  it("treats 4-6 digits as replacing zeros", () => {
    expect(getValue("3505")).toBe(350500);
    expect(getValue("35051")).toBe(350510);
    expect(getValue("350512")).toBe(350512);
  });

  it("treats 7+ digits as full numbers", () => {
    expect(getValue("1234567")).toBe(1234567);
    expect(getValue("12345678")).toBe(12345678);
    expect(getValue("1500000")).toBe(1500000);
  });
});

describe("formatInputValue", () => {
  it("returns empty for empty input", () => {
    expect(formatInputValue("")).toBe("");
  });

  it("returns raw digits for 1-3 digits", () => {
    expect(formatInputValue("3")).toBe("3");
    expect(formatInputValue("35")).toBe("35");
    expect(formatInputValue("350")).toBe("350");
  });

  it("formats 4-5 digits with single dot", () => {
    expect(formatInputValue("3505")).toBe("350.5");
    expect(formatInputValue("35051")).toBe("350.51");
  });

  it("formats 6+ digits with thousand separators", () => {
    expect(formatInputValue("350512")).toBe("350.512");
    expect(formatInputValue("350500")).toBe("350.500");
    expect(formatInputValue("1234567")).toBe("1.234.567");
    expect(formatInputValue("12345678")).toBe("12.345.678");
    expect(formatInputValue("1500000")).toBe("1.500.000");
  });
});

describe("getSuffixZeros", () => {
  it("returns .000 for 0-3 digits", () => {
    expect(getSuffixZeros("")).toBe(".000");
    expect(getSuffixZeros("3")).toBe(".000");
    expect(getSuffixZeros("35")).toBe(".000");
    expect(getSuffixZeros("350")).toBe(".000");
  });

  it("returns 00 for 4 digits", () => {
    expect(getSuffixZeros("3505")).toBe("00");
  });

  it("returns 0 for 5 digits", () => {
    expect(getSuffixZeros("35051")).toBe("0");
  });

  it("returns empty for 6+ digits", () => {
    expect(getSuffixZeros("350512")).toBe("");
    expect(getSuffixZeros("1234567")).toBe("");
    expect(getSuffixZeros("12345678")).toBe("");
  });
});

describe("parseInput", () => {
  it("removes non-digits", () => {
    expect(parseInput("350.500")).toBe("350500");
    expect(parseInput("1.234.567")).toBe("1234567");
    expect(parseInput("abc123def")).toBe("123");
  });

  it("removes leading zeros", () => {
    expect(parseInput("0123")).toBe("123");
    expect(parseInput("00350")).toBe("350");
  });

  it("handles empty input", () => {
    expect(parseInput("")).toBe("");
  });
});

describe("combined display (input + suffix)", () => {
  const getDisplay = (raw: string) => formatInputValue(raw) + getSuffixZeros(raw);

  it("shows placeholder format for 1-3 digits", () => {
    expect(getDisplay("3")).toBe("3.000");
    expect(getDisplay("35")).toBe("35.000");
    expect(getDisplay("350")).toBe("350.000");
  });

  it("shows partial replacement for 4-5 digits", () => {
    expect(getDisplay("3505")).toBe("350.500");
    expect(getDisplay("35051")).toBe("350.510");
  });

  it("shows full number for 6+ digits", () => {
    expect(getDisplay("350512")).toBe("350.512");
    expect(getDisplay("350500")).toBe("350.500");
    expect(getDisplay("1234567")).toBe("1.234.567");
    expect(getDisplay("1500000")).toBe("1.500.000");
    expect(getDisplay("12345678")).toBe("12.345.678");
  });
});
