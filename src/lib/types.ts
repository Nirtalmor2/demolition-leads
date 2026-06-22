// טיפוס ליד כפי שמגיע מ-/api/leads (לצד הלקוח).
import type { Source, Stage, LeadStatus } from "./domain";

export interface LeadDTO {
  id: string;
  source: Source;
  externalId: string;
  title: string;
  url: string | null;
  address: string | null;
  city: string | null;
  block: string | null;
  parcel: string | null;
  lat: number | null;
  lng: number | null;
  stage: Stage;
  expectedMonths: number | null;
  units: number | null;
  score: number;
  status: LeadStatus;
  assignee: string | null;
  developer: string | null;
  developerUrl: string | null;
  developerSource: "madlan" | "web" | null;
  firstSeenAt: string;
  lastSeenAt: string;
  rawData?: string; // JSON גולמי מהמקור — מוחזר רק בכרטיס ליד בודד
  _count?: { notes: number };
}

export interface NoteDTO {
  id: string;
  leadId: string;
  body: string;
  author: string | null;
  createdAt: string;
}
