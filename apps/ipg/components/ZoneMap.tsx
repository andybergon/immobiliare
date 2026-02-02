"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

interface Zone {
  id: string;
  name: string;
  slug: string;
  area: string;
  lat: number;
  lng: number;
  listingCount: number;
  z2?: number;
  z3?: number;
}

const isDev = process.env.NODE_ENV === "development";

function createCountIcon(count: number) {
  const hasListings = count > 0;
  return new DivIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${hasListings ? "#22c55e" : "#64748b"};
      color: white;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export default function ZoneMap() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const center: [number, number] = [41.8700, 12.4800];

  useEffect(() => {
    fetch("/api/zones")
      .then((res) => res.json())
      .then((data) => {
        setZones(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[600px] bg-slate-700 rounded-lg flex items-center justify-center">
        <p className="text-slate-400">Caricamento zone...</p>
      </div>
    );
  }

  const totalListings = zones.reduce((sum, z) => sum + z.listingCount, 0);

  return (
    <div>
      <div className="mb-4 text-sm text-slate-400">
        Totale annunci: <span className="text-white font-bold">{totalListings}</span> in {zones.filter(z => z.listingCount > 0).length} zone
      </div>
      <MapContainer
        center={center}
        zoom={11}
        className="w-full h-[600px] rounded-lg"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zones.map((zone) => (
          <Marker
            key={zone.id}
            position={[zone.lat, zone.lng]}
            icon={createCountIcon(zone.listingCount)}
          >
            <Popup>
              <div className="text-center min-w-[120px]">
                <h3 className="font-bold text-lg">{zone.name}</h3>
                {isDev ? (
                  <>
                    <p className="text-gray-400 text-xs font-mono">
                      {zone.z3 ? `microzone=${zone.z3}` : `macrozone=${zone.z2}`}
                    </p>
                    <p className="text-gray-500 text-xs mb-1">macroarea: {zone.area}</p>
                  </>
                ) : (
                  <p className="text-gray-500 text-xs uppercase mb-1">{zone.area}</p>
                )}
                <p className="text-gray-600 mb-2">
                  {zone.listingCount} annunci
                </p>
                {zone.listingCount > 0 ? (
                  <Link
                    href={`/play/${zone.slug}`}
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      textDecoration: 'none'
                    }}
                  >
                    Gioca
                  </Link>
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '14px' }}>Nessun annuncio</span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {zones.map((zone) => (
          <Circle
            key={`circle-${zone.id}`}
            center={[zone.lat, zone.lng]}
            radius={800}
            pathOptions={{
              color: zone.listingCount > 0 ? "#22c55e" : "#64748b",
              fillColor: zone.listingCount > 0 ? "#22c55e" : "#64748b",
              fillOpacity: 0.15,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
