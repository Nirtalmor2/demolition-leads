// מודל הדומיין — הערכים החוקיים לשדות ה-"enum" (SQLite שומר String).
// מקור אמת יחיד לטיפוסים, ולמיפוי שלב→score/צפי-חודשים (סעיפים 5 ו-8 בתוכנית).
import { z } from "zod";

export const SOURCES = [
  "URBAN_RENEWAL",
  "DANGEROUS_BUILDING",
  "IPLAN_PLAN",
  "DEMOLITION_PERMIT",
] as const;
export type Source = (typeof SOURCES)[number];

export const STAGES = [
  "PLANNING",
  "DEPOSITED",
  "APPROVED",
  "DANGEROUS_DECLARED",
  "DEMOLITION_PERMIT",
] as const;
export type Stage = (typeof STAGES)[number];

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
  "IRRELEVANT",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// תוויות לתצוגה בעברית
export const SOURCE_LABELS: Record<Source, string> = {
  URBAN_RENEWAL: "התחדשות עירונית",
  DANGEROUS_BUILDING: "מבנה מסוכן",
  IPLAN_PLAN: "תכנית (iplan)",
  DEMOLITION_PERMIT: "בקשת הריסה (ת״א)",
};

export const STAGE_LABELS: Record<Stage, string> = {
  PLANNING: "תכנון מוקדם",
  DEPOSITED: "הופקדה",
  APPROVED: "אושרה",
  DANGEROUS_DECLARED: "הוכרז מסוכן",
  DEMOLITION_PERMIT: "בקשת/היתר הריסה",
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "חדש",
  CONTACTED: "נוצר קשר",
  QUALIFIED: "מוסמך",
  PROPOSAL: "הצעה",
  WON: "נסגר בהצלחה",
  LOST: "אבד",
  IRRELEVANT: "לא רלוונטי",
};

// סעיף 8 — ניקוד דחיפות + צפי חודשים עד הריסה, נגזר מהשלב.
const STAGE_META: Record<Stage, { score: number; expectedMonths: number }> = {
  DANGEROUS_DECLARED: { score: 90, expectedMonths: 3 },
  DEMOLITION_PERMIT: { score: 88, expectedMonths: 3 },
  APPROVED: { score: 60, expectedMonths: 24 },
  DEPOSITED: { score: 50, expectedMonths: 36 },
  PLANNING: { score: 30, expectedMonths: 60 },
};

export function expectedMonthsForStage(stage: Stage): number {
  return STAGE_META[stage].expectedMonths;
}

// score = בסיס לפי שלב + בונוס קטן לפי מס' יח"ד (פרויקט גדול = ערך גבוה יותר), תקרה 100.
export function scoreLead(stage: Stage, units?: number | null): number {
  const base = STAGE_META[stage].score;
  let bonus = 0;
  if (units && units > 0) {
    if (units >= 500) bonus = 10;
    else if (units >= 200) bonus = 7;
    else if (units >= 100) bonus = 5;
    else if (units >= 30) bonus = 3;
    else bonus = 1;
  }
  return Math.min(100, base + bonus);
}

// סכמת ליד מנורמל שכל connector מחזיר (לפני upsert).
export const NormalizedLeadSchema = z.object({
  source: z.enum(SOURCES),
  externalId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  block: z.string().optional().nullable(),
  parcel: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  stage: z.enum(STAGES),
  units: z.number().int().optional().nullable(),
  rawData: z.unknown(),
});

export type NormalizedLead = z.infer<typeof NormalizedLeadSchema>;
