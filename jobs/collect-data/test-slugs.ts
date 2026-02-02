#!/usr/bin/env bun
const RESOLVER_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/resolver/url";
const PROPERTIES_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/properties";

const slugsToTest = [
  // Our slug → immobiliare slug candidates
  ["trieste", ["trieste-coppede", "salario-trieste"]],
  ["nomentano", ["bologna", "bologna-policlinico"]],
  ["talenti", ["talenti-monte-sacro"]],
  ["monte-sacro", ["talenti-monte-sacro"]],
  ["salario", ["nuovo-salario", "salario-trieste", "salario-porta-pia"]],
  ["laurentino", ["fonte-laurentina"]],
  ["ardeatino", ["ardeatino-montagnola"]],
  ["tuscolano", ["cinecitta-quadraro", "appio-tuscolano"]],
  ["prenestino", ["pigneto", "villa-gordiani"]],
  ["tiburtino", ["monti-tiburtini", "monti-tiburtini-pietralata"]],
  ["monteverde", ["monteverde-nuovo", "monteverde-vecchio", "monteverde-colli-portuensi"]],
  ["aurelio", ["aurelio-boccea", "aurelio-val-cannuta"]],
  ["trionfale", ["monte-mario-trionfale", "trionfale-monte-mario-ottavia"]],
  ["primavalle", ["battistini-primavalle"]],
  ["gianicolense", ["monteverde-colli-portuensi", "gianicolense-portuense"]],
  ["tor-bella-monaca", ["torre-angela", "tor-bella-monaca-torre-angela"]],
] as const;

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

console.log("Testing slug mappings...\n");
console.log("| Our Slug | Immobiliare Slug | Listings |");
console.log("|----------|------------------|----------|");

for (const [ourSlug, candidates] of slugsToTest) {
  let found = false;
  for (const candidate of candidates) {
    const result = await testSlug(candidate);
    if (result.works) {
      console.log(`| ${ourSlug} | ${candidate} | ${result.total} |`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`| ${ourSlug} | ❌ none found | - |`);
  }
  await new Promise(r => setTimeout(r, 100));
}
