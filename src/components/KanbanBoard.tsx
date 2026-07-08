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
      className={`card-hover cursor-grab touch-none rounded-lg border border-white/10 bg-dashboard-card p-2.5 active:cursor-grabbing ${
        isDragging && !overlay ? "opacity-30" : ""
      } ${overlay ? "rotate-2 shadow-xl border-white/20" : ""}`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-xs font-medium text-white">
          {lead.title}
        </span>
        <ScoreBadge score={lead.score} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <SourceBadge source={lead.source} />
        <span className="truncate text-[11px] text-white/40">
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
        <span className="text-sm font-semibold text-white/80">
          {STATUS_LABELS[status]}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/50">
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 rounded-xl border-2 border-dashed p-2 transition-colors ${
          isOver
            ? "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)]/10"
            : "border-white/5 bg-white/[0.02]"
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
