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
import {
  Building2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Clock,
} from "lucide-react";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [now, setNow] = useState(new Date());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchLeads = useCallback(async (f: Filters) => {
    setLoading(true);
    const res = await fetch(`/api/leads?${buildQuery(f)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, []);

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

  const clock = now.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const today = now.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-50 transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="relative w-full h-full overflow-hidden rounded-l-2xl bg-gradient-to-b from-[var(--primary-color)] to-[#0f1a30] border-l border-white/10 shadow-xl">
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 bg-white/[0.04] rounded-full" />
          <div className="pointer-events-none absolute bottom-20 -right-6 w-20 h-20 bg-white/[0.03] rounded-full" />

          {/* Logo */}
          <div className="flex justify-center px-4 pt-6 pb-4">
            {sidebarOpen ? (
              <img
                src="/greenmix.avif"
                alt="Niro"
                className="h-14 w-auto"
              />
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 px-3 mt-2" aria-label="ניווט ראשי">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  view === id
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon width={18} height={18} />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-right">{label}</span>
                    {view === id && <ChevronRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            ))}
          </nav>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
            aria-label={sidebarOpen ? "כווץ סרגל" : "הרחב סרגל"}
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                sidebarOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarOpen ? "mr-64" : "mr-16"
        }`}
      >
        <div className="p-6">
          {/* Gradient Header */}
          <header className="relative overflow-hidden rounded-2xl p-6 mb-6 animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-l from-[var(--primary-color)] via-[var(--secondary-color)] to-[var(--primary-color)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 bg-white/[0.06] rounded-full -translate-x-1/3 -translate-y-1/2" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 w-48 h-48 bg-white/[0.05] rounded-full translate-y-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  לידים להריסות
                </h1>
                <p className="text-white/60 text-sm mt-1">
                  כל הארץ · ממקורות פתוחים
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* KPIs */}
                <div className="hidden items-center gap-6 sm:flex">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {stats.total.toLocaleString("he-IL")}
                    </div>
                    <div className="text-xs text-white/60">לידים</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {stats.urgent.toLocaleString("he-IL")}
                    </div>
                    <div className="text-xs text-white/60">דחופים</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {stats.geo.toLocaleString("he-IL")}
                    </div>
                    <div className="text-xs text-white/60">על המפה</div>
                  </div>
                </div>

                {/* Glass clock badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] px-3 py-1 text-xs text-white/70 font-mono backdrop-blur-sm">
                  <Clock className="w-3 h-3" />
                  {clock} · {today}
                </span>

                {/* Refresh button */}
                <button
                  onClick={() => fetchLeads(filters)}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-white/20 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="רענון"
                  title="רענון"
                >
                  <RefreshIcon />
                </button>
              </div>
            </div>
          </header>

          {/* Stats cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-in">
            <StatsCard
              icon={<Building2 className="w-5 h-5" />}
              title="סה״כ לידים"
              value={stats.total}
              color="blue"
            />
            <StatsCard
              icon={<AlertTriangle className="w-5 h-5" />}
              title="דחופים"
              value={stats.urgent}
              color="red"
            />
            <StatsCard
              icon={<MapPin className="w-5 h-5" />}
              title="על המפה"
              value={stats.geo}
              color="green"
            />
          </div>

          {/* View toggle */}
          <div className="mb-4 flex items-center gap-3 animate-fade-in">
            <div className="flex rounded-lg border border-white/10 bg-dashboard-card p-1">
              {VIEWS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    view === id
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                  aria-pressed={view === id}
                >
                  <Icon width={15} height={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <FilterBar filters={filters} onChange={setFilters} />

          {/* Content area */}
          <div className="flex rounded-xl border border-white/10 bg-dashboard-card overflow-hidden mt-4 animate-fade-in">
            {selectedId && (
              <LeadDrawer
                leadId={selectedId}
                onClose={() => setSelectedId(null)}
                onChanged={() => fetchLeads(filters)}
              />
            )}

            <div className="relative min-w-0 flex-1 overflow-hidden">
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatsCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: "blue" | "red" | "green" | "purple" | "orange" | "yellow";
}) {
  const colorMap = {
    blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400",
    red: "from-red-500/20 to-red-600/20 border-red-500/30 text-red-400",
    green:
      "from-green-500/20 to-green-600/20 border-green-500/30 text-green-400",
    purple:
      "from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400",
    orange:
      "from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400",
    yellow:
      "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400",
  };

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 card-hover ${colorMap[color]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {value.toLocaleString("he-IL")}
          </p>
        </div>
        <div className="text-white/40">{icon}</div>
      </div>
    </div>
  );
}
