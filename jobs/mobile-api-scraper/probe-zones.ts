import { ApifyClient } from "apify-client";
import { ROME_ZONES } from "./zones.js";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(import.meta.dirname, "../../.env.local");
if (await Bun.file(envPath).exists()) {
  const content = await Bun.file(envPath).text();
  for (const line of content.split("\n")) {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  }
}

const ACTOR_ID = "memo23/immobiliare-scraper";

interface ProbeResult {
  zone: string;
  slug: string;
  url: string;
  totalResults: number | null;
  sampleCount: number;
  error?: string;
}

async function probeZone(zone: typeof ROME_ZONES[0]): Promise<ProbeResult> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN required");

  const client = new ApifyClient({ token });
  const url = `https://www.immobiliare.it/vendita-case/roma/${zone.immobiliareSlug || zone.slug}/`;

  try {
    const run = await client.actor(ACTOR_ID).call({
      startUrls: [{ url }],
      maxItems: 1,
      maxPages: 1,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Try to get total from run stats or item metadata
    const runInfo = await client.run(run.id).get();
    const stats = runInfo?.stats;

    return {
      zone: zone.name,
      slug: zone.slug,
      url,
      totalResults: null, // Actor doesn't expose total in metadata
      sampleCount: items.length,
    };
  } catch (err) {
    return {
      zone: zone.name,
      slug: zone.slug,
      url,
      totalResults: null,
      sampleCount: 0,
      error: String(err),
    };
  }
}

async function main() {
  console.log("🔍 Probing all Rome zones...\n");
  console.log("Note: This will make one small Apify request per zone (~$0.001 each)");
  console.log("Total estimated cost: ~$0.05 for 48 zones\n");

  const args = process.argv.slice(2);
  if (!args.includes("--confirm")) {
    console.log("Run with --confirm to proceed");
    console.log("\nAlternatively, check immobiliare.it directly:");
    for (const zone of ROME_ZONES.slice(0, 5)) {
      console.log(`  ${zone.name}: https://www.immobiliare.it/vendita-case/roma/${zone.immobiliareSlug || zone.slug}/`);
    }
    console.log("  ...");
    return;
  }

  const results: ProbeResult[] = [];

  for (const zone of ROME_ZONES) {
    process.stdout.write(`  ${zone.name}... `);
    const result = await probeZone(zone);
    results.push(result);
    console.log(result.error ? `❌ ${result.error}` : `✓ (${result.sampleCount} sample)`);

    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log("\n📊 Results:");
  console.log("Zone | Sample | URL");
  console.log("-----|--------|----");
  for (const r of results) {
    console.log(`${r.zone} | ${r.sampleCount} | ${r.url}`);
  }
}

main().catch(console.error);
