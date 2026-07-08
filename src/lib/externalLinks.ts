// קישורי העשרה חיצוניים לליד — איתור פרויקט/יזם במדלן.
// הערה: מדלן חוסם גישה תכנותית ל-API (PerimeterX), ומנועי החיפוש לא מחזירים
// תוצאות שמישות server-side — לכן זהו קישור-עומק שנפתח בדפדפן של המשתמש
// (שם אין חסימה) לאיתור הפרויקט. חילוץ שם היזם עצמו נעשה ב-src/lib/madlan.ts.
import type { LeadDTO } from "./types";

/**
 * מחרוזת חיפוש מייצגת לליד: רק הכתובת הראשונה (לידים רבים מאגדים עשרות כתובות
 * מופרדות בפסיק — שאילתה עם כולן מחזירה 0 תוצאות) + העיר.
 */
function leadQuery(lead: LeadDTO): string {
  const firstAddr = (lead.address ?? "").split(",")[0].trim();
  return [firstAddr, lead.city].filter(Boolean).join(" ");
}

/**
 * חיפוש פרויקט מדלן לכתובת הליד דרך גוגל (site:madlan.co.il/projects).
 * למה גוגל ולא מדלן ישירות: ה-URL `madlan.co.il/<כתובת>` לא מריץ חיפוש בדפדפן
 * (נוחת על עמוד הבית), בעוד חיפוש גוגל ממוקד נוחת על דף הפרויקט כשהוא קיים.
 * אם אין תוצאות — לרוב אין פרויקט מדלן לכתובת (כיסוי), לא תקלה.
 */
export function madlanSearchUrl(lead: LeadDTO): string {
  const term = leadQuery(lead);
  const q = term ? `site:madlan.co.il/projects ${term}` : "site:madlan.co.il/projects";
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
