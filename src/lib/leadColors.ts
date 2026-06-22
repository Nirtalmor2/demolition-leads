// מיפוי דחיפות (score) → צבע, לשימוש בטבלה/מפה/Kanban.
// סולם: אדום≥85 (מסוכן), כתום≥70 (מכרז), ענבר≥55 (מאושר), כחול≥40 (הופקד), אפור (תכנון).

export interface UrgencyStyle {
  hex: string; // למפה (markers)
  /** מחלקות Tailwind ל-badge */
  badge: string;
  label: string;
}

export function urgencyOf(score: number): UrgencyStyle {
  if (score >= 85)
    return {
      hex: "#dc2626",
      badge: "bg-red-100 text-red-800 ring-red-600/20",
      label: "דחוף מאוד",
    };
  if (score >= 70)
    return {
      hex: "#ea580c",
      badge: "bg-orange-100 text-orange-800 ring-orange-600/20",
      label: "דחוף",
    };
  if (score >= 55)
    return {
      hex: "#d97706",
      badge: "bg-amber-100 text-amber-800 ring-amber-600/20",
      label: "בינוני",
    };
  if (score >= 40)
    return {
      hex: "#2563eb",
      badge: "bg-blue-100 text-blue-800 ring-blue-600/20",
      label: "נמוך",
    };
  return {
    hex: "#64748b",
    badge: "bg-slate-100 text-slate-700 ring-slate-500/20",
    label: "ארוך טווח",
  };
}

// צבעי תגי מקור (רקע עדין + טקסט)
export const SOURCE_BADGE: Record<string, string> = {
  URBAN_RENEWAL: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  DANGEROUS_BUILDING: "bg-rose-50 text-rose-700 ring-rose-600/20",
  IPLAN_PLAN: "bg-teal-50 text-teal-700 ring-teal-600/20",
  DEMOLITION_PERMIT: "bg-orange-50 text-orange-700 ring-orange-600/20",
};
