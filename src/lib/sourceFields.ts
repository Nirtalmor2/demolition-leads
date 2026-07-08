// שדות נוספים פר-מקור להצגה בכרטיס הליד (מתוך rawData הגולמי).
// הוספת מקור/שדה = הוספת שורה כאן, ללא שינוי קומפוננטה.
import type { Source } from "./domain";

export interface ExtraField {
  key: string; // מפתח ב-rawData
  label: string; // תווית בעברית
  type?: "date" | "bool" | "text" | "long"; // long = טקסט ארוך (שורה מלאה)
}

export const EXTRA_FIELDS: Partial<Record<Source, ExtraField[]>> = {
  DEMOLITION_PERMIT: [
    { key: "demolition_floors", label: "קומות להריסה" },
    { key: "demolition_area", label: 'שטח הריסה (מ"ר)' },
    { key: "koteret", label: "כותרת הבקשה" },
    { key: "sug_bakasha", label: "סוג בקשה" },
    { key: "tochen_bakasha", label: "תוכן הבקשה", type: "long" },
    { key: "maslul_rishuy", label: "מסלול רישוי" },
    { key: "request_stage", label: "שלב בקשה" },
    { key: "permission_num", label: "מספר היתר" },
    { key: "permission_date", label: "תאריך היתר", type: "date" },
    { key: "expiry_date", label: "תוקף היתר", type: "date" },
    { key: "open_request", label: "פתיחת בקשה", type: "date" },
    { key: "tr_hathalat_bniya", label: "התחלת בנייה", type: "date" },
    { key: "ms_tik_binyan", label: "תיק בניין" },
    { key: "building_num", label: "קוד בניין" },
    { key: "sw_tama_38", label: 'תמ"א 38' },
    { key: "hakala_melel", label: "הקלות", type: "long" },
  ],
};

/** עיצוב ערך לתצוגה. תאריכי ArcGIS הם epoch ms. */
export function formatExtra(value: unknown, type?: ExtraField["type"]): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (type === "date") {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  const s = String(value).trim();
  return s === "" ? null : s;
}
