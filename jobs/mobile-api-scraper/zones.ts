import type { Zone } from "@ipg/db";
import { readFileSync } from "fs";
import { resolve } from "path";

const ZONES_FILE = resolve(import.meta.dirname, "../../data/zones.json");

interface ZonesConfig {
  version: number;
  updatedAt: string;
  zones: Zone[];
}

let _zonesCache: Zone[] | null = null;

function loadZones(): Zone[] {
  if (_zonesCache) return _zonesCache;

  const content = readFileSync(ZONES_FILE, "utf-8");
  const config: ZonesConfig = JSON.parse(content);
  _zonesCache = config.zones;
  return _zonesCache;
}

export function getAllZones(): Zone[] {
  return loadZones();
}

export function getZonesBySlug(slugs: string[]): Zone[] {
  return loadZones().filter((z) => slugs.includes(z.slug));
}

export function getZoneBySlug(slug: string): Zone | undefined {
  return loadZones().find((z) => z.slug === slug);
}

export function getZonesByArea(area: string): Zone[] {
  return loadZones().filter((z) => z.area === area);
}

export function getAreas(): string[] {
  const zones = loadZones();
  return [...new Set(zones.map((z) => z.area))];
}
