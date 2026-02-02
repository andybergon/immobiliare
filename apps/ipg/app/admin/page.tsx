"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface Z3Node {
  type: "z3";
  id: string;
  name: string;
  slug: string;
  z3: number;
  listingCount: number;
}

interface Z2Node {
  type: "z2";
  z2: number;
  name: string;
  listingCount: number;
  children: Z3Node[];
}

interface CityNode {
  type: "city";
  id: number;
  name: string;
  listingCount: number;
  children: Z2Node[];
}

interface RegionNode {
  type: "region";
  name: string;
  listingCount: number;
  children: CityNode[];
}

interface TreeData {
  tree: RegionNode[];
  stats: {
    totalListings: number;
    totalZones: number;
    zonesWithData: number;
  };
}

function TreeNode({
  label,
  count,
  id,
  idPrefix = "id",
  children,
  defaultExpanded = false,
}: {
  label: string;
  count: number;
  id?: string | number;
  idPrefix?: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = !!children;

  return (
    <div className="ml-4">
      <div
        className={`flex items-center gap-2 py-1 ${hasChildren ? "cursor-pointer hover:bg-slate-800 rounded px-2 -ml-2" : ""}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <span className="text-slate-500 w-4 text-center">
            {expanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <span className="font-medium">{label}</span>
        {id !== undefined && (
          <span className="text-slate-500 text-sm">({idPrefix}={id})</span>
        )}
        <span className="text-emerald-400 font-mono">#{count}</span>
      </div>
      {expanded && children && <div className="border-l border-slate-700">{children}</div>}
    </div>
  );
}

function RegionTree({ region }: { region: RegionNode }) {
  return (
    <TreeNode label={region.name} count={region.listingCount}>
      {region.children.map((city) => (
        <CityTree key={city.name} city={city} />
      ))}
    </TreeNode>
  );
}

function CityTree({ city }: { city: CityNode }) {
  return (
    <TreeNode label={city.name} count={city.listingCount} id={city.id} idPrefix="c">
      {city.children.map((z2) => (
        <Z2Tree key={z2.z2} z2={z2} />
      ))}
    </TreeNode>
  );
}

function Z2Tree({ z2 }: { z2: Z2Node }) {
  return (
    <TreeNode label={z2.name} count={z2.listingCount} id={z2.z2} idPrefix="z2">
      {z2.children.map((z3) => (
        <Z3Tree key={z3.z3} z3={z3} />
      ))}
    </TreeNode>
  );
}

function Z3Tree({ z3 }: { z3: Z3Node }) {
  return (
    <div className="ml-4 py-1 flex items-center gap-2">
      <span className="w-4" />
      <Link
        href={`/play/${z3.slug}`}
        className="font-medium hover:text-blue-400 hover:underline"
      >
        {z3.name}
      </Link>
      <span className="text-slate-500 text-sm">(z3={z3.z3})</span>
      <span className="text-emerald-400 font-mono">#{z3.listingCount}</span>
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/zones-tree")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <div className="max-w-4xl w-full">
          <div className="mb-6">
            <Breadcrumbs items={[{ label: "Admin" }]} />
            <h1 className="text-3xl font-bold mt-4">Loading...</h1>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <div className="max-w-4xl w-full">
          <div className="mb-6">
            <Breadcrumbs items={[{ label: "Admin" }]} />
            <h1 className="text-3xl font-bold mt-4 text-red-400">Error</h1>
          </div>
          <p>{error || "Failed to load data"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl w-full">
        <div className="mb-6">
          <Breadcrumbs items={[{ label: "Admin" }]} />
          <h1 className="text-3xl font-bold mt-4">Zone Tree</h1>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Stats</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-400">
                {data.stats.totalListings.toLocaleString()}
              </div>
              <div className="text-slate-400 text-sm">Total Listings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {data.stats.zonesWithData}/{data.stats.totalZones}
              </div>
              <div className="text-slate-400 text-sm">Zones with Data</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">
                {Math.round((data.stats.zonesWithData / data.stats.totalZones) * 100)}%
              </div>
              <div className="text-slate-400 text-sm">Coverage</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Zone Hierarchy</h2>
          <p className="text-slate-400 text-sm mb-4">
            Click to expand. Structure: region → city (c=id) → z2 (macrozone) → z3 (microzone)
          </p>
          <div className="font-mono text-sm">
            {data.tree.map((region) => (
              <RegionTree key={region.name} region={region} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
