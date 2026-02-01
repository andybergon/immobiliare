#!/usr/bin/env bun
/**
 * Get listing counts from immobiliare.it using the mobile API (free, fast)
 *
 * Usage:
 *   bun run jobs/collect-data/get-counts.ts           # All zones
 *   bun run jobs/collect-data/get-counts.ts --area=centro
 *   bun run jobs/collect-data/get-counts.ts --zones=axa,trastevere
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const RESOLVER_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/resolver/url";
const PROPERTIES_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/properties";

interface Zone {
  id: string;
  name: string;
  slug: string;
  area: string;
  city: string;
  region: string;
}

interface ZoneResult {
  zone: Zone;
  websiteCount: number | null;
  localCount: number;
  error?: string;
}

// Load zones
const zonesPath = resolve(import.meta.dirname, "../../data/zones.json");
const zonesData = JSON.parse(readFileSync(zonesPath, "utf-8"));
const zones: Zone[] = zonesData.zones;

// Get local count
async function getLocalCount(zone: Zone): Promise<number> {
  const path = resolve(
    import.meta.dirname,
    `../../data/listings/${zone.region}/${zone.city}/${zone.area}/${zone.slug}/immobiliare.json`
  );
  try {
    const file = Bun.file(path);
    if (await file.exists()) {
      const data = await file.json();
      return data.listingCount || 0;
    }
  } catch {}
  return 0;
}

// Get website count using mobile API
async function getWebsiteCount(zone: Zone): Promise<number | null> {
  const searchUrl = `https://www.immobiliare.it/vendita-case/${zone.city}/${zone.slug}/`;

  try {
    // Step 1: Resolve URL to get API params
    const resolverRes = await fetch(`${RESOLVER_URL}?url=${encodeURIComponent(searchUrl)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!resolverRes.ok) return null;
    const resolverData = await resolverRes.json();

    if (resolverData.type !== "search" || !resolverData.params) {
      return null;
    }

    // Step 2: Query properties endpoint for count
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(resolverData.params)) {
      params.set(key, String(value));
    }
    params.set("start", "0");

    const propertiesRes = await fetch(`${PROPERTIES_URL}?${params}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!propertiesRes.ok) return null;
    const propertiesData = await propertiesRes.json();

    return propertiesData.totalActive ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const areaFilter = args.find((a) => a.startsWith("--area="))?.split("=")[1];
  const zoneFilter = args
    .find((a) => a.startsWith("--zones="))
    ?.split("=")[1]
    ?.split(",");
  const jsonOutput = args.includes("--json");

  let targetZones = zones;
  if (areaFilter) {
    targetZones = zones.filter((z) => z.area === areaFilter);
  } else if (zoneFilter) {
    targetZones = zones.filter((z) => zoneFilter.includes(z.slug));
  }

  if (targetZones.length === 0) {
    console.error("No zones matched.");
    console.error("Available areas:", [...new Set(zones.map((z) => z.area))].join(", "));
    process.exit(1);
  }

  const results: ZoneResult[] = [];

  if (!jsonOutput) {
    console.log(`\n# Rome Zones - Listing Counts\n`);
    console.log(`Generated: ${new Date().toISOString().split("T")[0]}\n`);
  }

  // Group by area
  const byArea = new Map<string, Zone[]>();
  for (const zone of targetZones) {
    const arr = byArea.get(zone.area) || [];
    arr.push(zone);
    byArea.set(zone.area, arr);
  }

  for (const [area, areaZones] of [...byArea.entries()].sort()) {
    const sortedZones = areaZones.sort((a, b) => a.name.localeCompare(b.name));

    if (!jsonOutput) {
      console.log(`## ${area.charAt(0).toUpperCase() + area.slice(1)} (${sortedZones.length} zones)\n`);
      console.log("| Zone | Website | Local | Coverage |");
      console.log("|------|--------:|------:|----------|");
    }

    for (const zone of sortedZones) {
      process.stderr.write(`  ${zone.name}...`);

      const [websiteCount, localCount] = await Promise.all([
        getWebsiteCount(zone),
        getLocalCount(zone),
      ]);

      results.push({ zone, websiteCount, localCount });

      // Coverage status
      let coverage = "";
      if (websiteCount === null) {
        coverage = "❓ Unknown";
      } else if (localCount === 0) {
        coverage = "⬜ No data";
      } else if (localCount >= websiteCount) {
        coverage = "✅ Complete";
      } else {
        const pct = Math.round((localCount / websiteCount) * 100);
        coverage = `📥 ${pct}%`;
      }

      process.stderr.write(` ${websiteCount ?? "?"}\n`);

      if (!jsonOutput) {
        const webStr = websiteCount !== null ? String(websiteCount) : "?";
        const localStr = localCount > 0 ? String(localCount) : "-";
        console.log(`| ${zone.name} | ${webStr} | ${localStr} | ${coverage} |`);
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 100));
    }

    if (!jsonOutput) console.log();
  }

  // Summary
  const totalWeb = results
    .filter((r) => r.websiteCount !== null)
    .reduce((sum, r) => sum + (r.websiteCount || 0), 0);
  const totalLocal = results.reduce((sum, r) => sum + r.localCount, 0);
  const zonesWithData = results.filter((r) => r.localCount > 0).length;
  const zonesChecked = results.filter((r) => r.websiteCount !== null).length;

  if (jsonOutput) {
    console.log(JSON.stringify({ results, summary: { totalWeb, totalLocal, zonesWithData, zonesChecked } }, null, 2));
  } else {
    console.log("## Summary\n");
    console.log(`| Metric | Value |`);
    console.log(`|--------|------:|`);
    console.log(`| Zones checked | ${zonesChecked}/${results.length} |`);
    console.log(`| Total on website | ${totalWeb.toLocaleString()} |`);
    console.log(`| Total local | ${totalLocal.toLocaleString()} |`);
    console.log(`| Zones with data | ${zonesWithData}/${results.length} |`);

    if (totalWeb > 0) {
      const coverage = Math.round((totalLocal / totalWeb) * 100);
      console.log(`| Overall coverage | ${coverage}% |`);
    }

    console.log(`\n_Data source: immobiliare.it mobile API_`);
  }
}

main().catch(console.error);
