"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LeadDTO } from "@/lib/types";
import type { LeadStatus } from "@/lib/domain";
import { FilterBar, EMPTY_FILTERS, type Filters } from "./FilterBar";
import { LeadsTable } from "./LeadsTable";
import { KanbanBoard } from "./KanbanBoard";
import { LeadDrawer } from "./LeadDrawer";
import { Spinner } from "./ui";
import { TableIcon, MapIcon, KanbanIcon, RefreshIcon } from "./icons";

// MapLibre זקוק ל-window → טעינה דינמית ללא SSR
const LeadsMap = dynamic(
  () => import("./LeadsMap").then((m) => m.LeadsMap),
  { ssr: false, loading: () => <Spinner label="טוען מפה…" /> }
);

type View = "table" | "map" | "kanban";

const VIEWS: { id: View; label: string; Icon: typeof TableIcon }[] = [
  { id: "table", label: "טבלה", Icon: TableIcon },
  { id: "map", label: "מפה", Icon: MapIcon },
  { id: "kanban", label: "Kanban", Icon: KanbanIcon },
];

function buildQuery(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.source) sp.set("source", f.source);
  if (f.city) sp.set("city", f.city);
  if (f.status) sp.set("status", f.status);
  if (f.minScore) sp.set("minScore", f.minScore);
  if (f.q) sp.set("q", f.q);
  sp.set("sort", f.sort);
  sp.set("dir", f.dir);
  return sp.toString();
}

export function CrmApp() {
  const [view, setView] = useState<View>("table");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async (f: Filters) => {
    setLoading(true);
    const res = await fetch(`/api/leads?${buildQuery(f)}`, { cache: "no-store" });
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, []);

  // q עם debounce; שאר הסינונים מיידיים
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLeads(filters), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchLeads]);

  const stats = useMemo(() => {
    const urgent = leads.filter((l) => l.score >= 85).length;
    const geo = leads.filter((l) => l.lat != null).length;
    return { total: leads.length, urgent, geo };
  }, [leads]);

  const onStatusChange = async (id: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <NiroLogo />
          <div className="hidden border-s border-[var(--color-border)] ps-3 leading-tight sm:block">
            <h1 className="text-sm font-bold text-[var(--color-text)]">
              לידים להריסות
            </h1>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              כל הארץ · ממקורות פתוחים
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* KPI */}
          <div className="hidden items-center gap-4 text-xs sm:flex">
            <Kpi label="לידים" value={stats.total} />
            <Kpi label="דחופים" value={stats.urgent} tone="text-[var(--color-urgent)]" />
            <Kpi label="על המפה" value={stats.geo} />
          </div>

          {/* View toggle */}
          <div className="flex rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-0.5">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                data-view={id}
                onClick={() => setView(id)}
                className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === id
                    ? "bg-white text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
                aria-pressed={view === id}
              >
                <Icon width={16} height={16} />
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchLeads(filters)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border-strong)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            aria-label="רענון"
            title="רענון"
          >
            <RefreshIcon />
          </button>
        </div>
      </header>

      <FilterBar filters={filters} onChange={setFilters} />

      {/* Main + drawer בשורה — המגירה דוחפת את התוכן במקום להסתיר אותו */}
      <div className="flex flex-1 overflow-hidden">
        {/* המגירה ראשונה → בצד ימין ב-RTL */}
        {selectedId && (
          <LeadDrawer
            leadId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={() => fetchLeads(filters)}
          />
        )}

        <main className="relative min-w-0 flex-1 overflow-hidden bg-[var(--color-bg)]">
          {loading && view !== "map" ? (
            <Spinner />
          ) : view === "table" ? (
            <LeadsTable
              leads={leads}
              filters={filters}
              onChange={setFilters}
              onSelect={setSelectedId}
            />
          ) : view === "map" ? (
            <LeadsMap leads={leads} onSelect={setSelectedId} />
          ) : (
            <KanbanBoard
              leads={leads}
              onSelect={setSelectedId}
              onStatusChange={onStatusChange}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// לוגו "niro" — מארק טיפת-סיכה (מתכתב עם סיכות הלידים על המפה) + wordmark עם גרדיאנט.
function NiroLogo() {
  return (
    <span className="flex select-none items-center gap-2" aria-label="niro" dir="ltr">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#0ea5e9] shadow-sm ring-1 ring-black/5">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#ffffff"
            d="M12 2.5c-3.6 0-6.5 2.9-6.5 6.5 0 4.7 6.5 12 6.5 12s6.5-7.3 6.5-12c0-3.6-2.9-6.5-6.5-6.5z"
          />
          <circle cx="12" cy="9" r="2.6" fill="#f59e0b" />
        </svg>
      </span>
      <span className="bg-gradient-to-l from-[#1e40af] via-[#2563eb] to-[#0ea5e9] bg-clip-text text-[26px] font-extrabold lowercase leading-none tracking-tight text-transparent">
        niro
      </span>
    </span>
  );
}

function Kpi({
  label,
  value,
  tone = "text-[var(--color-text)]",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className={`text-base font-bold ${tone}`}>
        {value.toLocaleString("he-IL")}
      </span>
      <span className="text-[10px] text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}
