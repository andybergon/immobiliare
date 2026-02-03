#!/usr/bin/env bun
/**
 * Extract all macrozones and microzones from Rome by sampling properties
 */

const PROPERTIES_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/properties";

interface ZoneInfo {
  id: number;
  name: string;
  count: number;
  macrozoneId?: number;
  macrozoneName?: string;
}

async function getAllZones() {
  const macrozones = new Map<number, ZoneInfo>();
  const microzones = new Map<number, ZoneInfo>();
  let offset = 0;

  console.log("Sampling properties to extract zones...");

  while (offset < 5000) {
    const url = `${PROPERTIES_URL}?c=6737&cat=1&t=v&pr=RM&start=${offset}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const data = await res.json();

    for (const prop of data.list || []) {
      const macro = prop.geography?.macrozone;
      const micro = prop.geography?.microzone;

      if (macro?.id && macro?.name) {
        const existing = macrozones.get(macro.id);
        if (existing) {
          existing.count++;
        } else {
          macrozones.set(macro.id, { id: macro.id, name: macro.name, count: 1 });
        }
      }

      if (micro?.id && micro?.name) {
        const existing = microzones.get(micro.id);
        if (existing) {
          existing.count++;
        } else {
          microzones.set(micro.id, {
            id: micro.id,
            name: micro.name,
            count: 1,
            macrozoneId: macro?.id,
            macrozoneName: macro?.name
          });
        }
      }
    }

    offset += 20;
    process.stdout.write(`\r  Processed ${offset} listings, found ${macrozones.size} macrozones, ${microzones.size} microzones`);

    if (!data.list || data.list.length === 0) break;
    await new Promise(r => setTimeout(r, 30));
  }

  console.log("\n\n=== MACROZONES (z2) ===\n");

  const sortedMacro = [...macrozones.values()].sort((a, b) => a.name.localeCompare(b.name));
  console.log("| ID | Name | Count |");
  console.log("|----|------|-------|");
  for (const z of sortedMacro) {
    console.log(`| ${z.id} | ${z.name} | ${z.count} |`);
  }
  console.log(`\nTotal macrozones: ${macrozones.size}`);

  console.log("\n\n=== MICROZONES (z3) ===\n");

  const sortedMicro = [...microzones.values()].sort((a, b) => a.name.localeCompare(b.name));
  console.log("| ID | Name | Macrozone | Count |");
  console.log("|----|------|-----------|-------|");
  for (const z of sortedMicro) {
    console.log(`| ${z.id} | ${z.name} | ${z.macrozoneName || '?'} | ${z.count} |`);
  }
  console.log(`\nTotal microzones: ${microzones.size}`);
}

getAllZones();
