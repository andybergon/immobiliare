import type { Zone } from "@ipg/db";

export const ROME_ZONES: Zone[] = [
  {
    id: "lazio-roma-axa",
    name: "Axa",
    slug: "axa",
    region: "lazio",
    province: "roma",
    city: "roma",
    immobiliareParams: {
      idQuartiere: "10962",
    },
  },
  {
    id: "lazio-roma-casal-palocco",
    name: "Casal Palocco",
    slug: "casal-palocco",
    region: "lazio",
    province: "roma",
    city: "roma",
    immobiliareParams: {
      idQuartiere: "10259",
    },
  },
  {
    id: "lazio-roma-infernetto",
    name: "Infernetto",
    slug: "infernetto",
    region: "lazio",
    province: "roma",
    city: "roma",
    immobiliareParams: {
      idQuartiere: "12721",
    },
  },
  {
    id: "lazio-roma-ostia",
    name: "Ostia",
    slug: "ostia",
    region: "lazio",
    province: "roma",
    city: "roma",
    immobiliareParams: {
      idMZona: "10259",
    },
  },
  {
    id: "lazio-roma-acilia",
    name: "Acilia",
    slug: "acilia",
    region: "lazio",
    province: "roma",
    city: "roma",
    immobiliareParams: {
      idQuartiere: "10081",
    },
  },
  {
    id: "lazio-roma-trastevere",
    name: "Trastevere",
    slug: "trastevere",
    region: "lazio",
    province: "roma",
    city: "roma",
    immobiliareParams: {
      idQuartiere: "11217",
    },
  },
  {
    id: "lazio-roma-testaccio",
    name: "Testaccio",
    slug: "testaccio",
    region: "lazio",
    province: "roma",
    city: "roma",
    immobiliareParams: {
      idQuartiere: "11213",
    },
  },
  {
    id: "lazio-roma-prati",
    name: "Prati",
    slug: "prati",
    region: "lazio",
    province: "roma",
    city: "roma",
    immobiliareParams: {
      idQuartiere: "11112",
    },
  },
];

export function getZonesBySlug(slugs: string[]): Zone[] {
  return ROME_ZONES.filter((z) => slugs.includes(z.slug));
}

export function getAllZones(): Zone[] {
  return ROME_ZONES;
}
