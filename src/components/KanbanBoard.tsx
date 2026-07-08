"use client";
import { useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { LeadDTO } from "@/lib/types";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from "@/lib/domain";
import { ScoreBadge, SourceBadge } from "./ui";

function Card({
  lead,
  onSelect,
  overlay = false,
}: {
  lead: LeadDTO;
  onSelect?: (id: string) => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { status: lead.status },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect?.(lead.id)}
      className={`cursor-grab touch-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-sm transition-colors hover:border-[var(--color-border-strong)] active:cursor-grabbing ${
        isDragging && !overlay ? "opacity-30" : ""
      } ${overlay ? "rotate-2 shadow-lg" : ""}`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-xs font-medium text-[var(--color-text)]">
          {lead.title}
        </span>
        <ScoreBadge score={lead.score} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <SourceBadge source={lead.source} />
        <span className="truncate text-[11px] text-[var(--color-text-subtle)]">
          {lead.city ?? ""}
        </span>
      </div>
    </div>
  );
}

function Column({
  status,
  leads,
  onSelect,
}: {
  status: LeadStatus;
  leads: LeadDTO[];
  onSelect: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {STATUS_LABELS[status]}
        </span>
        <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver
            ? "border-[var(--color-primary)] bg-blue-50/60"
            : "border-[var(--color-border)] bg-[var(--color-surface-2)]/40"
        }`}
      >
        {leads.map((l) => (
          <Card key={l.id} lead={l} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({
  leads,
  onSelect,
  onStatusChange,
}: {
  leads: LeadDTO[];
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, LeadDTO[]>();
    for (const s of LEAD_STATUSES) map.set(s, []);
    for (const l of leads) map.get(l.status)?.push(l);
    return map;
  }, [leads]);

  const active = activeId ? leads.find((l) => l.id === activeId) : null;

  const handleStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const from = active.data.current?.status as LeadStatus | undefined;
    const to = over.id as LeadStatus;
    if (from !== to) onStatusChange(String(active.id), to);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {LEAD_STATUSES.map((s) => (
          <Column
            key={s}
            status={s}
            leads={byStatus.get(s) ?? []}
            onSelect={onSelect}
          />
        ))}
      </div>
      <DragOverlay>{active ? <Card lead={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
