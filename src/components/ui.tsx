"use client";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { urgencyOf, SOURCE_BADGE } from "@/lib/leadColors";
import {
  SOURCE_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
  type Source,
  type Stage,
} from "@/lib/domain";

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const u = urgencyOf(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${u.badge}`}
      title={u.label}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: u.hex }}
        aria-hidden
      />
      {score}
    </span>
  );
}

export function SourceBadge({ source }: { source: Source }) {
  return (
    <Badge
      className={
        SOURCE_BADGE[source] ?? "bg-slate-500/15 text-slate-400 ring-slate-500/30"
      }
    >
      {SOURCE_LABELS[source] ?? source}
    </Badge>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge className="bg-slate-500/15 text-slate-400 ring-slate-500/30">
      {STAGE_LABELS[stage] ?? stage}
    </Badge>
  );
}

export { STATUS_LABELS };

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-white/50">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-9 cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition-colors focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent)]/20 ${className}`}
    />
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-white/50">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--dashboard-accent)]" />
      {label ?? "טוען…"}
    </div>
  );
}
