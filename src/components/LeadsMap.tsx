"use client";
import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import type { LeadDTO } from "@/lib/types";

// בסיס מפה חינמי (CARTO Positron, raster) — ללא מפתח API. RTL ידידותי, נקי לדאשבורד.
const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

// צבע נקודה לפי score (סולם הדחיפות)
const COLOR_EXPR = [
  "step",
  ["get", "score"],
  "#64748b",
  40,
  "#2563eb",
  55,
  "#d97706",
  70,
  "#ea580c",
  85,
  "#dc2626",
] as unknown as maplibregl.ExpressionSpecification;

function toGeoJSON(leads: LeadDTO[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: leads
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [l.lng!, l.lat!] },
        properties: { id: l.id, score: l.score, title: l.title },
      })),
  };
}

export function LeadsMap({
  leads,
  onSelect,
}: {
  leads: LeadDTO[];
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // אתחול חד-פעמי
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [35.0, 31.6],
      zoom: 7,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    // התאמת גודל הקנבס כשרוחב המיכל משתנה (פתיחת/סגירת המגירה)
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    map.on("load", () => {
      map.addSource("leads", { type: "geojson", data: toGeoJSON([]) });
      map.addLayer({
        id: "leads",
        type: "circle",
        source: "leads",
        paint: {
          "circle-color": COLOR_EXPR,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "score"],
            30,
            4,
            90,
            9,
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      const popup = new maplibregl.Popup({
        closeButton: false,
        offset: 10,
      });
      map.on("mouseenter", "leads", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (f) {
          popup
            .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
            .setHTML(`<strong>${f.properties?.title ?? ""}</strong>`)
            .addTo(map);
        }
      });
      map.on("mouseleave", "leads", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
      map.on("click", "leads", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onSelectRef.current(String(id));
      });

      readyRef.current = true;
      const src = map.getSource("leads") as GeoJSONSource | undefined;
      src?.setData(toGeoJSON(pendingRef.current ?? []));
    });

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // עדכון נתונים כשהלידים משתנים
  const pendingRef = useRef<LeadDTO[]>(leads);
  pendingRef.current = leads;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("leads") as GeoJSONSource | undefined;
    src?.setData(toGeoJSON(leads));
  }, [leads]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-6 right-3 z-10 rounded-md border border-[var(--color-border)] bg-white/95 p-2.5 text-xs shadow-sm">
        <div className="mb-1 font-semibold text-[var(--color-text)]">דחיפות</div>
        {[
          ["#dc2626", "דחוף מאוד (85+)"],
          ["#ea580c", "דחוף (70+)"],
          ["#d97706", "בינוני (55+)"],
          ["#2563eb", "נמוך (40+)"],
          ["#64748b", "ארוך טווח"],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5 leading-5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
            <span className="text-[var(--color-text-muted)]">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
