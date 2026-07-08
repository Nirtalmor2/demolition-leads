"use client";
import type { LeadDTO } from "@/lib/types";
import type { Filters } from "./FilterBar";
import { ScoreBadge, SourceBadge, StageBadge, STATUS_LABELS } from "./ui";
import { SortIcon, PinIcon } from "./icons";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [25, 50, 100];

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
      className={`sticky top-0 z-10 whitespace-nowrap bg-dashboard-card px-3 py-2.5 text-right text-xs font-semibold text-white/50 ${
        field ? "cursor-pointer select-none hover:text-white/80" : ""
      } ${className}`}
      onClick={field ? () => onSort(field) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {field && (
          <SortIcon
            width={12}
            height={12}
            className={
              active ? "text-[var(--dashboard-accent)]" : "text-white/30"
            }
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
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  leads: LeadDTO[];
  filters: Filters;
  onChange: (f: Filters) => void;
  onSelect: (id: string) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (sz: number) => void;
}) {
  const onSort = (field: string) => {
    const dir =
      filters.sort === field && filters.dir === "desc" ? "asc" : "desc";
    onChange({ ...filters, sort: field, dir });
  };

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <SortHeader label="כותרת" filters={filters} onSort={onSort} />
              <SortHeader label="מקור" filters={filters} onSort={onSort} />
              <SortHeader
                label="עיר"
                field="city"
                filters={filters}
                onSort={onSort}
              />
              <SortHeader label="שלב" filters={filters} onSort={onSort} />
              <SortHeader
                label="דחיפות"
                field="score"
                filters={filters}
                onSort={onSort}
              />
              <SortHeader label="יח״ד מתוכננות" filters={filters} onSort={onSort} />
              <SortHeader label="סטטוס" filters={filters} onSort={onSort} />
              <SortHeader
                label="נצפה"
                field="lastSeenAt"
                filters={filters}
                onSort={onSort}
              />
              <SortHeader label="הערות" filters={filters} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                onClick={() => onSelect(l.id)}
                className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]"
              >
                <td className="max-w-xs px-3 py-2 font-medium text-white">
                  <div className="flex items-center gap-1.5">
                    {l.lat != null && (
                      <PinIcon
                        width={13}
                        height={13}
                        className="shrink-0 text-white/30"
                      />
                    )}
                    <span className="truncate">{l.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <SourceBadge source={l.source} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-white/50">
                  {l.city ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <StageBadge stage={l.stage} />
                </td>
                <td className="px-3 py-2">
                  <ScoreBadge score={l.score} />
                </td>
                <td className="px-3 py-2 text-white/50">
                  {l.units ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-white/50">
                  {STATUS_LABELS[l.status]}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-white/40">
                  {fmtDate(l.lastSeenAt)}
                </td>
                <td className="px-3 py-2 text-center text-white/50">
                  {l._count?.notes ? l._count.notes : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && (
          <div className="p-10 text-center text-sm text-white/50">
            לא נמצאו לידים התואמים את הסינון.
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {total > 0 && (
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-3 text-white/50">
            <span>
              {from.toLocaleString("he-IL")}–{to.toLocaleString("he-IL")} מתוך{" "}
              {total.toLocaleString("he-IL")}
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs">הצג:</label>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-7 cursor-pointer rounded border border-white/10 bg-white/5 px-1.5 text-xs text-white outline-none"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-white/10 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="הקודם"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => {
              if (
                totalPages <= 7 ||
                i === 0 ||
                i === totalPages - 1 ||
                Math.abs(i - page) <= 1
              ) {
                return (
                  <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded text-xs transition-colors ${
                      i === page
                        ? "bg-[var(--dashboard-accent)] text-white"
                        : "text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              }
              if (
                i === 1 ||
                i === totalPages - 2
              ) {
                return (
                  <span
                    key={i}
                    className="flex h-8 w-8 items-center justify-center text-xs text-white/30"
                  >
                    …
                  </span>
                );
              }
              return null;
            })}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-white/10 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="הבא"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
