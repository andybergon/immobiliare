#!/usr/bin/env bun
/**
 * Find correct immobiliare.it slugs for zones that don't resolve
 */

const RESOLVER_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/resolver/url";
const PROPERTIES_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/properties";

const brokenSlugs = [
  "trieste", "nomentano", "talenti", "monte-sacro", "salario",
  "laurentino", "ardeatino", "tuscolano", "prenestino", "tiburtino",
  "monteverde", "aurelio", "trionfale", "primavalle", "gianicolense",
  "tor-bella-monaca"
];

// Common variations to try
const variations = (slug: string): string[] => [
  slug,
  slug.replace(/-/g, ""),  // remove hyphens
  slug + "-roma",
  "quartiere-" + slug,
  slug.replace("monte-", "monte"),
  slug.replace("tor-", "tor"),
  // Add "nuovo/vecchio" variants for some
  slug + "-nuovo",
  slug + "-vecchio",
];

async function testSlug(slug: string): Promise<{ works: boolean; total?: number }> {
  const url = `https://www.immobiliare.it/vendita-case/roma/${slug}/`;
  try {
    const res = await fetch(`${RESOLVER_URL}?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!res.ok) return { works: false };
    const data = await res.json();
    if (data.type !== "search") return { works: false };

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(data.params as Record<string, unknown>)) {
      params.set(k, String(v));
    }
    params.set("start", "0");
    const propRes = await fetch(`${PROPERTIES_URL}?${params}`);
    const propData = await propRes.json();
    return { works: true, total: propData.totalActive };
  } catch {
    return { works: false };
  }
}

async function findWorkingSlug(originalSlug: string): Promise<{ original: string; working?: string; total?: number }> {
  // First test the original
  const origResult = await testSlug(originalSlug);
  if (origResult.works) {
    return { original: originalSlug, working: originalSlug, total: origResult.total };
  }

  // Try variations
  for (const variant of variations(originalSlug)) {
    if (variant === originalSlug) continue;
    const result = await testSlug(variant);
    if (result.works) {
      return { original: originalSlug, working: variant, total: result.total };
    }
  }

  return { original: originalSlug };
}

console.log("Testing broken slugs...\n");

for (const slug of brokenSlugs) {
  const result = await findWorkingSlug(slug);
  if (result.working) {
    if (result.working === result.original) {
      console.log(`✅ ${slug}: works (${result.total} listings)`);
    } else {
      console.log(`🔄 ${slug} → ${result.working} (${result.total} listings)`);
    }
  } else {
    console.log(`❌ ${slug}: no working variant found`);
  }
  await new Promise(r => setTimeout(r, 100));
}
