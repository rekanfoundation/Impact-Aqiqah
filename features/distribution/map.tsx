"use client";

import { useEffect, useRef, useState } from "react";
import type { MapPoint, SlaughterPoint } from "@/server/db/distribution";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    __gmapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmapsPromise) return window.__gmapsPromise;
  window.__gmapsPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=visualization`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load gagal"));
    document.head.appendChild(s);
  });
  return window.__gmapsPromise;
}

export function DistributionMap({
  apiKey,
  slaughter,
  points,
  center,
}: {
  apiKey: string;
  slaughter: SlaughterPoint[];
  points: MapPoint[];
  center: { lat: number; lng: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !ref.current) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = window.google as any;
        const map = new g.maps.Map(ref.current, {
          center,
          zoom: points.length || slaughter.length ? 9 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // titik potong (lokasi) — penanda biru
        slaughter.forEach((s) => {
          new g.maps.Marker({
            position: { lat: s.lat, lng: s.lng },
            map,
            title: `Titik potong: ${s.name}`,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
          });
        });

        // titik distribusi — penanda hijau + heatmap
        points.forEach((p) => {
          new g.maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map,
            title: `${p.label}${p.area ? ` · ${p.area}` : ""} (${p.weight} paket)`,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: "#22c55e",
              fillOpacity: 0.95,
              strokeColor: "#fff",
              strokeWeight: 1,
            },
          });
        });

        if (points.length && g.maps.visualization) {
          const heat = new g.maps.visualization.HeatmapLayer({
            data: points.map((p) => ({
              location: new g.maps.LatLng(p.lat, p.lng),
              weight: p.weight,
            })),
            radius: 32,
            opacity: 0.6,
          });
          heat.setMap(map);
        }
      })
      .catch(() => {
        if (!cancelled) setErr("Gagal memuat Google Maps. Periksa API key & daftar domain (HTTP referrer) yang diizinkan di Google Cloud.");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, slaughter, points, center]);

  if (!apiKey) {
    return (
      <div className="flex h-[460px] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
        Peta nonaktif — set <code className="mx-1 rounded bg-neutral-200 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> untuk menampilkan peta sebaran.
      </div>
    );
  }

  return (
    <div>
      <div ref={ref} className="h-[460px] w-full overflow-hidden rounded-xl border border-neutral-200" />
      {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <div className="mt-2 flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2563eb]" /> Titik potong</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22c55e]" /> Titik distribusi</span>
        <span>🔥 Heatmap = kepadatan paket</span>
      </div>
    </div>
  );
}
