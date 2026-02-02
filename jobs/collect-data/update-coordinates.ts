#!/usr/bin/env bun
/**
 * Update zones.json coordinates using average from mobile API listing geolocations
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const PROPERTIES_URL = "https://ios-imm-v4.ws-app.com/b2c/v1/properties";

interface ZoneConfig {
  id: string;
  name: string;
  slug: string;
  coordinates: { lat: number; lng: number };
  immobiliareZ2?: number;
  immobiliareZ3?: number;
}

interface ZonesFile {
  version: number;
  updatedAt: string;
  zones: ZoneConfig[];
}

async function getZoneCoordinates(zone: ZoneConfig): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    c: "6737",
    cat: "1",
    t: "v",
    pr: "RM",
  });

  if (zone.immobiliareZ3) {
    params.set("z3", String(zone.immobiliareZ3));
  } else if (zone.immobiliareZ2) {
    params.set("z2", String(zone.immobiliareZ2));
  } else {
    return null;
  }

  try {
    const response = await fetch(`${PROPERTIES_URL}?${params}&start=0`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const listings = data.list || [];

    if (listings.length === 0) return null;

    // Get coordinates from first 10 listings and average them
    const coords: { lat: number; lng: number }[] = [];
    for (const listing of listings.slice(0, 10)) {
      const geo = listing.geography?.geolocation;
      if (geo?.latitude && geo?.longitude) {
        coords.push({ lat: geo.latitude, lng: geo.longitude });
      }
    }

    if (coords.length === 0) return null;

    const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
    const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;

    return {
      lat: Math.round(avgLat * 10000) / 10000,
      lng: Math.round(avgLng * 10000) / 10000,
    };
  } catch {
    return null;
  }
}

async function main() {
  const zonesPath = resolve(import.meta.dirname, "../../data/zones.json");
  const zonesData: ZonesFile = JSON.parse(readFileSync(zonesPath, "utf-8"));

  console.log(`Updating coordinates for ${zonesData.zones.length} zones...\n`);

  let updated = 0;
  let failed = 0;

  for (const zone of zonesData.zones) {
    const newCoords = await getZoneCoordinates(zone);

    if (newCoords) {
      const oldCoords = zone.coordinates;
      const latDiff = Math.abs(newCoords.lat - oldCoords.lat);
      const lngDiff = Math.abs(newCoords.lng - oldCoords.lng);

      if (latDiff > 0.005 || lngDiff > 0.005) {
        console.log(`✅ ${zone.name}: (${oldCoords.lat}, ${oldCoords.lng}) → (${newCoords.lat}, ${newCoords.lng})`);
        zone.coordinates = newCoords;
        updated++;
      } else {
        console.log(`  ${zone.name}: OK (diff < 0.005)`);
      }
    } else {
      console.log(`❌ ${zone.name}: failed to get coordinates`);
      failed++;
    }

    // Be nice
    await new Promise(r => setTimeout(r, 100));
  }

  zonesData.updatedAt = new Date().toISOString().split("T")[0];
  writeFileSync(zonesPath, JSON.stringify(zonesData, null, 2) + "\n");

  console.log(`\nDone: ${updated} updated, ${failed} failed`);
}

main().catch(console.error);
