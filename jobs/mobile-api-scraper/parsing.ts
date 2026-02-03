export function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function parseCount(value: unknown): { value: number | null; raw: string | null } {
  if (value === undefined || value === null) return { value: null, raw: null };
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, raw: null } : { value: null, raw: null };
  }

  const s = String(value).trim();
  if (!s) return { value: null, raw: null };

  const plusMatch = s.match(/^(\d+)\s*\+$/);
  if (plusMatch) {
    return { value: parseInt(plusMatch[1], 10), raw: `${plusMatch[1]}+` };
  }

  const intMatch = s.match(/^(\d+)$/);
  if (intMatch) {
    return { value: parseInt(intMatch[1], 10), raw: null };
  }

  const anyDigits = s.match(/(\d+)/);
  if (!anyDigits) {
    return { value: null, raw: s };
  }

  return { value: parseInt(anyDigits[1], 10), raw: s };
}

export function parseFloor(value: unknown): { value: number | null; raw: string | null } {
  if (value === undefined || value === null) return { value: null, raw: null };
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, raw: null } : { value: null, raw: null };
  }

  const s = String(value).trim();
  if (!s) return { value: null, raw: null };
  if (/^-?\d+$/.test(s)) return { value: parseInt(s, 10), raw: null };
  return { value: null, raw: s };
}
