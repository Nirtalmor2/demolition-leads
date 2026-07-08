"use client";
import type { LeadDTO } from "@/lib/types";
import type { Filters } from "./FilterBar";
import { ScoreBadge, SourceBadge, StageBadge, STATUS_LABELS } from "./ui";
import { SortIcon, PinIcon } from "./icons";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

function SortHeader({
  label,
  field,
  filters,
  onSort,
  className = "",
}: {
  label: string;
  field?: string;
  filters: Filters;
  onSort: (f: string) => void;
  className?: string;
}) {
  const active = field && filters.sort === field;
  return (
    <th
      className={`sticky top-0 z-10 whitespace-nowrap bg-[var(--color-surface-2)] px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-muted)] ${
        field ? "cursor-pointer select-none hover:text-[var(--color-text)]" : ""
      } ${className}`}
      onClick={field ? () => onSort(field) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {field && (
          <SortIcon
            width={12}
            height={12}
            className={active ? "text-[var(--color-primary)]" : "text-[var(--color-text-subtle)]"}
          />
        )}
      </span>
    </th>
  );
}

export function LeadsTable({
  leads,
  filters,
  onChange,
  onSelect,
}: {
  leads: LeadDTO[];
  filters: Filters;
  onChange: (f: Filters) => void;
  onSelect: (id: string) => void;
}) {
  const onSort = (field: string) => {
    const dir =
      filters.sort === field && filters.dir === "desc" ? "asc" : "desc";
    onChange({ ...filters, sort: field, dir });
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <SortHeader label="כותרת" filters={filters} onSort={onSort} />
            <SortHeader label="מקור" filters={filters} onSort={onSort} />
            <SortHeader label="עיר" field="city" filters={filters} onSort={onSort} />
            <SortHeader label="שלב" filters={filters} onSort={onSort} />
            <SortHeader label="דחיפות" field="score" filters={filters} onSort={onSort} />
            <SortHeader label="יח״ד מתוכננות" filters={filters} onSort={onSort} />
            <SortHeader label="סטטוס" filters={filters} onSort={onSort} />
            <SortHeader label="נצפה" field="lastSeenAt" filters={filters} onSort={onSort} />
            <SortHeader label="הערות" filters={filters} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr
              key={l.id}
              onClick={() => onSelect(l.id)}
              className="cursor-pointer border-b border-[var(--color-border)] bg-[var(--color-surface)] transition-colors hover:bg-blue-50/60"
            >
              <td className="max-w-xs px-3 py-2 font-medium text-[var(--color-text)]">
                <div className="flex items-center gap-1.5">
                  {l.lat != null && (
                    <PinIcon
                      width={13}
                      height={13}
                      className="shrink-0 text-[var(--color-text-subtle)]"
                    />
                  )}
                  <span className="truncate">{l.title}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <SourceBadge source={l.source} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--color-text-muted)]">
                {l.city ?? "—"}
              </td>
              <td className="px-3 py-2">
                <StageBadge stage={l.stage} />
              </td>
              <td className="px-3 py-2">
                <ScoreBadge score={l.score} />
              </td>
              <td className="px-3 py-2 text-[var(--color-text-muted)]">
                {l.units ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--color-text-muted)]">
                {STATUS_LABELS[l.status]}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--color-text-subtle)]">
                {fmtDate(l.lastSeenAt)}
              </td>
              <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">
                {l._count?.notes ? l._count.notes : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length === 0 && (
        <div className="p-10 text-center text-sm text-[var(--color-text-muted)]">
          לא נמצאו לידים התואמים את הסינון.
        </div>
      )}
    </div>
  );
}
