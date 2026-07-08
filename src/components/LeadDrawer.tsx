"use client";
import { useEffect, useState } from "react";
import type { LeadDTO, NoteDTO } from "@/lib/types";
import {
  LEAD_STATUSES,
  STATUS_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
} from "@/lib/domain";
import { ScoreBadge, SourceBadge, Select } from "./ui";
import {
  CloseIcon,
  LinkIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from "./icons";
import { EXTRA_FIELDS, formatExtra } from "@/lib/sourceFields";
import { madlanSearchUrl } from "@/lib/externalLinks";

const extLinkClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 py-2 text-sm font-medium text-[var(--dashboard-accent)] transition-colors hover:bg-white/10";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/5 py-2 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-left font-medium text-white/90">
        {value ?? "—"}
      </span>
    </div>
  );
}

function DeveloperSourceBadge({
  source,
}: {
  source: LeadDTO["developerSource"];
}) {
  if (!source) return null;
  const isMadlan = source === "madlan";
  const cls = isMadlan
    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
    : "border-amber-500/30 bg-amber-500/15 text-amber-400";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
      title={
        isMadlan
          ? "אומת מתוך דף הפרויקט במדלן"
          : "ניחוש מחיפוש רשת כללי — לא אומת מול מדלן"
      }
    >
      {isMadlan ? "מדלן" : "רשת · לא מאומת"}
    </span>
  );
}

function ExtraDetails({ lead }: { lead: LeadDTO }) {
  const spec = EXTRA_FIELDS[lead.source];
  if (!spec || !lead.rawData) return null;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(lead.rawData);
  } catch {
    return null;
  }

  const rows = spec
    .map((f) => ({ f, val: formatExtra(raw[f.key], f.type) }))
    .filter((r) => r.val !== null);
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <h3 className="mb-2 text-sm font-semibold text-white">
        פרטי היתר ובקשה
      </h3>
      <div className="flex flex-col">
        {rows.map(({ f, val }) =>
          f.type === "long" ? (
            <div
              key={f.key}
              className="border-b border-white/5 py-2 text-sm last:border-0"
            >
              <span className="mb-0.5 block text-xs text-white/50">
                {f.label}
              </span>
              <span className="block whitespace-pre-wrap leading-relaxed text-white/80">
                {val}
              </span>
            </div>
          ) : (
            <div
              key={f.key}
              className="flex justify-between gap-3 border-b border-white/5 py-2 text-sm last:border-0"
            >
              <span className="text-white/50">{f.label}</span>
              <span className="text-left font-medium text-white/90">
                {val}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function LeadDrawer({
  leadId,
  onClose,
  onChanged,
}: {
  leadId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [lead, setLead] = useState<LeadDTO | null>(null);
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [assignee, setAssignee] = useState("");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [madlanUrl, setMadlanUrl] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullErr, setPullErr] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [madlanMiss, setMadlanMiss] = useState(false);

  useEffect(() => {
    let alive = true;
    setLead(null);
    fetch(`/api/leads/${leadId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setLead(d.lead);
        setNotes(d.lead.notes ?? []);
        setAssignee(d.lead.assignee ?? "");
      });
    return () => {
      alive = false;
    };
  }, [leadId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    const r = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (d.lead) setLead((prev) => ({ ...(prev as LeadDTO), ...d.lead }));
    setSaving(false);
    onChanged();
  };

  const pull = async (body: Record<string, unknown>) => {
    if (pulling) return;
    setPulling(true);
    setPullErr(null);
    try {
      const r = await fetch(`/api/leads/${leadId}/madlan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setPullErr(d.error ?? "שגיאה במשיכת היזם");
        setMadlanMiss(Boolean(d.notFoundInMadlan));
      } else {
        setLead((prev) =>
          prev
            ? {
                ...prev,
                developer: d.developer,
                developerUrl: d.developerUrl,
                developerSource: d.developerSource,
              }
            : prev
        );
        setMadlanUrl("");
        setShowManual(false);
        setMadlanMiss(false);
        onChanged();
      }
    } catch {
      setPullErr("שגיאת רשת");
    }
    setPulling(false);
  };
  const pullAuto = () => pull({});
  const pullWeb = () => pull({ web: true });
  const pullManual = () => madlanUrl.trim() && pull({ url: madlanUrl.trim() });

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    const r = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    const d = await r.json();
    if (d.note) setNotes((n) => [d.note, ...n]);
    setNoteText("");
    setSaving(false);
    onChanged();
  };

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-dashboard-card animate-slide-in lg:w-[400px]">
      {!lead ? (
        <div className="p-8 text-center text-sm text-white/50">טוען…</div>
      ) : (
        <>
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-dashboard-card/80 backdrop-blur-sm p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <SourceBadge source={lead.source} />
                <ScoreBadge score={lead.score} />
              </div>
              <h2 className="text-base font-bold leading-snug text-white">
                {lead.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="סגור"
            >
              <CloseIcon />
            </button>
          </header>

          <div className="flex flex-col gap-4 p-4">
            {/* CRM actions */}
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-white/50">
                סטטוס ליד
                <Select
                  value={lead.status}
                  disabled={saving}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-white/50">
                הקצאה לאיש מכירות
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <UserIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder="שם / אימייל"
                      className="h-9 w-full rounded-md border border-white/10 bg-white/5 pr-8 pl-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent)]/20"
                    />
                  </div>
                  <button
                    onClick={() => patch({ assignee })}
                    disabled={saving || assignee === (lead.assignee ?? "")}
                    className="h-9 cursor-pointer rounded-md bg-white/10 px-3 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    שמירה
                  </button>
                </div>
              </label>
            </div>

            {/* Lead details */}
            <div>
              <Row label="שלב" value={STAGE_LABELS[lead.stage]} />
              <Row label="מקור" value={SOURCE_LABELS[lead.source]} />
              <Row label="עיר" value={lead.city} />
              <Row label="כתובת" value={lead.address} />
              <Row label="יח״ד מתוכננות" value={lead.units} />
              <Row
                label="צפי עד הריסה"
                value={
                  lead.expectedMonths ? `~${lead.expectedMonths} חודשים` : null
                }
              />
              <Row
                label="מיקום"
                value={
                  lead.lat != null ? (
                    <span className="inline-flex items-center gap-1 text-white/50">
                      <PinIcon width={13} height={13} />
                      {lead.lat.toFixed(4)}, {lead.lng!.toFixed(4)}
                    </span>
                  ) : null
                }
              />
              <Row label="נצפה לראשונה" value={fmt(lead.firstSeenAt)} />
              <Row label="עודכן לאחרונה" value={fmt(lead.lastSeenAt)} />
            </div>

            <ExtraDetails lead={lead} />

            {lead.url && (
              <a
                href={lead.url}
                target="_blank"
                rel="noreferrer"
                className={extLinkClass}
              >
                <LinkIcon width={15} height={15} />
                פתיחת המקור
              </a>
            )}

            {/* Developer lookup */}
            <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <UserIcon width={15} height={15} />
                יזם
              </h3>

              {lead.developer ? (
                <Row
                  label="שם היזם"
                  value={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {lead.developerUrl ? (
                        <a
                          href={lead.developerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--dashboard-accent)] hover:underline"
                        >
                          {lead.developer}
                        </a>
                      ) : (
                        lead.developer
                      )}
                      <DeveloperSourceBadge source={lead.developerSource} />
                    </span>
                  }
                />
              ) : (
                <p className="text-xs text-white/40">
                  לחיצה תאתר את היזם במדלן לפי כתובת הליד.
                </p>
              )}

              <button
                onClick={pullAuto}
                disabled={pulling}
                className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--dashboard-accent)] text-sm font-medium text-white transition-colors hover:bg-[var(--dashboard-accent)]/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SearchIcon width={15} height={15} />
                {pulling
                  ? "מחפש…"
                  : lead.developer
                    ? "חפש שוב במדלן"
                    : "חפש יזם במדלן"}
              </button>

              {pullErr && (
                <p className="text-xs text-[var(--status-failed)]">{pullErr}</p>
              )}

              {madlanMiss && (
                <button
                  type="button"
                  onClick={pullWeb}
                  disabled={pulling}
                  className="inline-flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-transparent text-sm font-medium text-white/50 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SearchIcon width={14} height={14} />
                  הרחב חיפוש כללי ברשת
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowManual((s) => !s)}
                className="cursor-pointer self-start text-xs text-white/40 underline hover:text-white/60"
              >
                {showManual ? "הסתר חיפוש ידני" : "לא נמצא? חיפוש ידני"}
              </button>

              {showManual && (
                <div className="flex flex-col gap-2">
                  <a
                    href={madlanSearchUrl(lead)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="חיפוש פרויקט היזם במדלן לפי כתובת"
                    className={extLinkClass}
                  >
                    <LinkIcon width={15} height={15} />
                    חיפוש פרויקט במדלן
                  </a>
                  <div className="flex gap-2">
                    <input
                      value={madlanUrl}
                      onChange={(e) => setMadlanUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && pullManual()}
                      placeholder="הדבק קישור לדף הפרויקט במדלן"
                      dir="ltr"
                      className="h-9 flex-1 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white outline-none placeholder:text-right focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent)]/20"
                    />
                    <button
                      onClick={pullManual}
                      disabled={pulling || !madlanUrl.trim()}
                      className="h-9 cursor-pointer rounded-md bg-[var(--dashboard-accent)] px-3 text-sm font-medium text-white transition-colors hover:bg-[var(--dashboard-accent)]/80 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      משוך
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">
                הערות ({notes.length})
              </h3>
              <div className="mb-2 flex gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  placeholder="הוספת הערה…"
                  className="flex-1 resize-none rounded-md border border-white/10 bg-white/5 p-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent)]/20"
                />
                <button
                  onClick={addNote}
                  disabled={saving || !noteText.trim()}
                  className="flex h-fit items-center gap-1 self-end rounded-md bg-[var(--dashboard-accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--dashboard-accent)]/80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <PlusIcon width={15} height={15} />
                  הוסף
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-md border border-white/10 bg-white/[0.02] p-2.5 text-sm"
                  >
                    <p className="whitespace-pre-wrap text-white/80">
                      {n.body}
                    </p>
                    <span className="mt-1 block text-[11px] text-white/40">
                      {n.author ? `${n.author} · ` : ""}
                      {fmt(n.createdAt)}
                    </span>
                  </li>
                ))}
                {notes.length === 0 && (
                  <li className="py-2 text-center text-xs text-white/40">
                    אין הערות עדיין.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
