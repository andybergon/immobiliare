#!/usr/bin/env bun
/**
 * Update zones.json with immobiliare.it zone IDs (z2 macrozone, z3 microzone)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Zone ID mapping
// z2 = macrozone (broad area), z3 = microzone (specific neighborhood)
// Some zones only have z2 (they span the entire macrozone)
const ZONE_MAP: Record<string, { z2: number; z3?: number }> = {
  // Centro
  "centro-storico": { z2: 10303 }, // Macrozone only - has many microzones inside
  "trastevere": { z2: 10156, z3: 10822 },
  "testaccio": { z2: 10156, z3: 10821 },
  "san-lorenzo": { z2: 10150, z3: 10806 },
  "esquilino": { z2: 10149, z3: 10805 },

  // Nord
  "parioli": { z2: 10146, z3: 10796 },
  "flaminio": { z2: 10146, z3: 10795 },
  "trieste": { z2: 10147, z3: 12719 }, // Trieste - Coppedè
  "prati": { z2: 10145, z3: 10793 },
  "nomentano": { z2: 10148, z3: 10803 }, // Bologna microzone
  "talenti": { z2: 10161, z3: 12715 }, // Talenti - Monte Sacro
  "monte-sacro": { z2: 10161, z3: 12715 }, // Same as talenti
  "vigna-clara": { z2: 10159, z3: 10832 }, // Vigna Clara - Vigna Stelluti
  "fleming": { z2: 10159, z3: 10834 },
  "salario": { z2: 10161, z3: 10839 }, // Nuovo Salario

  // Sud
  "eur": { z2: 10169, z3: 10879 },
  "garbatella": { z2: 10153, z3: 10815 },
  "ostiense": { z2: 10153, z3: 10820 },
  "san-paolo": { z2: 10154, z3: 10817 },
  "marconi": { z2: 10154, z3: 10883 },
  "torrino": { z2: 10169, z3: 10880 },
  "laurentino": { z2: 10307, z3: 14449 }, // Fonte Laurentina
  "ardeatino": { z2: 10167, z3: 12726 }, // Ardeatino - Montagnola

  // Est
  "san-giovanni": { z2: 10151, z3: 10811 },
  "appio-latino": { z2: 10152, z3: 10813 },
  "tuscolano": { z2: 10152, z3: 11662 }, // Furio Camillo
  "cinecitta": { z2: 10283, z3: 10856 },
  "centocelle": { z2: 10164, z3: 10855 },
  "prenestino": { z2: 10150, z3: 10809 }, // Pigneto
  "torpignattara": { z2: 10164, z3: 11449 },
  "tiburtino": { z2: 10163, z3: 10851 }, // Monti Tiburtini
  "pietralata": { z2: 10163, z3: 10847 },

  // Ovest
  "monteverde": { z2: 10304, z3: 10889 }, // Monteverde Nuovo
  "aurelio": { z2: 10172, z3: 12709 }, // Aurelio - Val Cannuta
  "balduina": { z2: 10281, z3: 10826 },
  "trionfale": { z2: 10302, z3: 12712 }, // Monte Mario - Trionfale
  "primavalle": { z2: 10173, z3: 12728 }, // Battistini - Primavalle
  "boccea": { z2: 10172, z3: 12716 },
  "gianicolense": { z2: 10304, z3: 10888 }, // Colli Portuensi - Casaletto

  // Litorale
  "axa": { z2: 10259, z3: 10962 },
  "casal-palocco": { z2: 10259, z3: 12721 },
  "infernetto": { z2: 10259, z3: 10964 },
  "ostia-antica": { z2: 10181, z3: 10976 },
  "ostia-levante": { z2: 10181, z3: 11632 },
  "ostia-ponente": { z2: 10181, z3: 10977 },
  "lido-di-ostia-castel-fusano": { z2: 10181 }, // Macrozone only - no specific z3
  "acilia": { z2: 10180, z3: 10961 },

  // Periferia
  "porta-di-roma": { z2: 10162, z3: 11638 },
  "bufalotta": { z2: 10176, z3: 12731 },
  "tor-bella-monaca": { z2: 10177, z3: 10927 }, // Torre Angela
  "torre-angela": { z2: 10177, z3: 10927 },
};

const zonesPath = resolve(import.meta.dirname, "../../data/zones.json");
const zonesData = JSON.parse(readFileSync(zonesPath, "utf-8"));

let updated = 0;
for (const zone of zonesData.zones) {
  const mapping = ZONE_MAP[zone.slug];
  if (mapping) {
    // Remove old field if present
    delete zone.immobiliareZoneId;
    // Add new fields
    zone.immobiliareZ2 = mapping.z2;
    if (mapping.z3) {
      zone.immobiliareZ3 = mapping.z3;
    }
    updated++;
    const z3Info = mapping.z3 ? `z3=${mapping.z3}` : "(z2 only)";
    console.log(`✅ ${zone.slug} → z2=${mapping.z2}, ${z3Info}`);
  } else {
    console.log(`❌ ${zone.slug} - no mapping found`);
  }
}

zonesData.updatedAt = new Date().toISOString().split("T")[0];

writeFileSync(zonesPath, JSON.stringify(zonesData, null, 2) + "\n");
console.log(`\nUpdated ${updated} zones in zones.json`);
