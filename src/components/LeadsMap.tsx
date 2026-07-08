"use client";
import { useEffect, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import type { LeadDTO } from "@/lib/types";

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

const COLOR_EXPR = [
  "step",
  ["get", "score"],
  "#718096",
  40,
  "#4299e1",
  55,
  "#ecc94b",
  70,
  "#ed8936",
  85,
  "#f56565",
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
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-left"
    );

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
          "circle-stroke-color": "#0f1117",
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
            .setLngLat(
              (f.geometry as GeoJSON.Point).coordinates as [number, number]
            )
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
      <div className="pointer-events-none absolute bottom-6 right-3 z-10 rounded-lg border border-white/10 bg-dashboard-card/90 backdrop-blur-sm p-2.5 text-xs shadow-lg">
        <div className="mb-1 font-semibold text-white">דחיפות</div>
        {[
          ["#f56565", "דחוף מאוד (85+)"],
          ["#ed8936", "דחוף (70+)"],
          ["#ecc94b", "בינוני (55+)"],
          ["#4299e1", "נמוך (40+)"],
          ["#718096", "ארוך טווח"],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5 leading-5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: c }}
            />
            <span className="text-white/50">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
