"use client";
import { Field, Select } from "./ui";
import { SearchIcon } from "./icons";
import {
  SOURCES,
  LEAD_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "@/lib/domain";

export interface Filters {
  source: string;
  city: string;
  status: string;
  minScore: string;
  q: string;
  sort: string;
  dir: string;
}

export const EMPTY_FILTERS: Filters = {
  source: "",
  city: "",
  status: "",
  minScore: "",
  q: "",
  sort: "score",
  dir: "desc",
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-dashboard-card px-4 py-3 mb-4 animate-fade-in">
      <Field label="חיפוש חופשי">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="כותרת, כתובת, גוש/חלקה…"
            className="h-9 w-56 rounded-md border border-white/10 bg-white/5 pr-8 pl-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent)]/20"
          />
        </div>
      </Field>

      <Field label="מקור">
        <Select
          value={filters.source}
          onChange={(e) => set({ source: e.target.value })}
        >
          <option value="">הכל</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="עיר">
        <input
          value={filters.city}
          onChange={(e) => set({ city: e.target.value })}
          placeholder="כל הערים"
          className="h-9 w-36 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent)]/20"
        />
      </Field>

      <Field label="סטטוס">
        <Select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">הכל</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="דחיפות מינ׳">
        <Select
          value={filters.minScore}
          onChange={(e) => set({ minScore: e.target.value })}
        >
          <option value="">הכל</option>
          <option value="85">דחוף מאוד (85+)</option>
          <option value="70">דחוף (70+)</option>
          <option value="55">בינוני (55+)</option>
          <option value="40">נמוך (40+)</option>
        </Select>
      </Field>

      {(filters.source ||
        filters.city ||
        filters.status ||
        filters.minScore ||
        filters.q) && (
        <button
          onClick={() =>
            onChange({ ...EMPTY_FILTERS, sort: filters.sort, dir: filters.dir })
          }
          className="h-9 cursor-pointer rounded-md px-3 text-sm font-medium text-[var(--dashboard-accent)] transition-colors hover:bg-white/5"
        >
          נקה סינון
        </button>
      )}
    </div>
  );
}
