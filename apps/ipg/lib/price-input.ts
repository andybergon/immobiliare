/**
 * Price Input Logic
 *
 * Rules:
 * - Digits 1-3: Represent thousands (XXX,000). Type "350" → €350,000
 * - Digits 4-6: Replace placeholder zeros. Type "3505" → €350,500
 * - Digits 7+: Full number entry. Type "1500000" → €1,500,000
 * - Max 9 digits (up to €999,999,999)
 */

export function formatWithThousands(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatInputValue(raw: string): string {
  if (!raw) return "";
  if (raw.length <= 3) return raw;
  if (raw.length <= 5) {
    return raw.slice(0, 3) + "." + raw.slice(3);
  }
  const value = getValue(raw);
  return formatWithThousands(value);
}

export function getSuffixZeros(raw: string): string {
  if (raw.length <= 3) return ".000";
  if (raw.length === 4) return "00";
  if (raw.length === 5) return "0";
  return "";
}

export function getValue(raw: string): number {
  if (!raw) return 0;
  if (raw.length <= 3) {
    return parseInt(raw, 10) * 1000;
  }
  const firstPart = raw.slice(0, 3);
  const secondPart = raw.slice(3).padEnd(3, "0");
  return parseInt(firstPart + secondPart, 10);
}

export function parseInput(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}
