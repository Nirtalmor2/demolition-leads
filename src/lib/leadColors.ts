export interface UrgencyStyle {
  hex: string;
  badge: string;
  label: string;
}

export function urgencyOf(score: number): UrgencyStyle {
  if (score >= 85)
    return {
      hex: "#f56565",
      badge:
        "bg-red-500/15 text-red-400 ring-red-500/30",
      label: "דחוף מאוד",
    };
  if (score >= 70)
    return {
      hex: "#ed8936",
      badge:
        "bg-orange-500/15 text-orange-400 ring-orange-500/30",
      label: "דחוף",
    };
  if (score >= 55)
    return {
      hex: "#ecc94b",
      badge:
        "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30",
      label: "בינוני",
    };
  if (score >= 40)
    return {
      hex: "#4299e1",
      badge:
        "bg-blue-500/15 text-blue-400 ring-blue-500/30",
      label: "נמוך",
    };
  return {
    hex: "#718096",
    badge:
      "bg-slate-500/15 text-slate-400 ring-slate-500/30",
    label: "ארוך טווח",
  };
}

export const SOURCE_BADGE: Record<string, string> = {
  URBAN_RENEWAL:
    "bg-indigo-500/15 text-indigo-400 ring-indigo-500/30",
  DANGEROUS_BUILDING:
    "bg-rose-500/15 text-rose-400 ring-rose-500/30",
  IPLAN_PLAN:
    "bg-teal-500/15 text-teal-400 ring-teal-500/30",
  DEMOLITION_PERMIT:
    "bg-orange-500/15 text-orange-400 ring-orange-500/30",
};
