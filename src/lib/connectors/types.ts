// חוזה אחיד לכל connector (סעיף 6 בתוכנית).
import type { NormalizedLead, Source } from "@/lib/domain";

// רשומה גולמית כפי שחזרה מהמקור (attributes + אולי geometry).
export type RawRecord = Record<string, unknown>;

export interface Connector {
  source: Source;
  /** שם תצוגה לוג/UI */
  label: string;
  /** משיכת כל הרשומות עם pagination פנימי */
  fetchRaw(): Promise<RawRecord[]>;
  /** נירמול רשומה גולמית לליד. מחזיר null אם הרשומה לא רלוונטית/לא תקינה. */
  toLead(raw: RawRecord): NormalizedLead | null;
}
