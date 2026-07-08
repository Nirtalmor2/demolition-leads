// Connector 3 — תכניות iplan / מבא"ת (IPLAN_PLAN). עומק ארצי (סעיף 6.3).
// מקור: שכבת "קווים כחולים — תכניות מקוונות" של מנהל התכנון (ArcGIS REST, ללא token).
// סינון: תמ"א 38/2 + פינוי-בינוי, בשלב הפקדה/אישור בלבד. גאומטריה ITM (2039).
import { arcgisQueryAll, featureToRaw } from "./arcgis";
import { geometryToLatLng } from "@/lib/geo";
import type { Connector, RawRecord } from "./types";
import type { NormalizedLead, Stage } from "@/lib/domain";

const LAYER_URL =
  "https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1";

const OUT_FIELDS = [
  "pl_number",
  "pl_name",
  "station_desc",
  "internet_short_status",
  "plan_county_name",
  "entity_subtype_desc",
  "pl_objectives",
  "pq_authorised_quantity_120",
  "pl_url",
  "last_update_date",
].join(",");

// where clauses: ASCII-safe (תמ"א 38 לפי '38') ועברית (פינוי-בינוי) כ-best-effort.
const WHERE_CLAUSES = [
  "pl_name LIKE '%38%' OR pl_objectives LIKE '%38%'",
  "pl_name LIKE '%פינוי בינוי%' OR pl_objectives LIKE '%פינוי בינוי%'",
  "pl_name LIKE '%פינוי-בינוי%' OR pl_objectives LIKE '%פינוי-בינוי%'",
];

const APPROVED = new Set(["פרסום אישור", "התכנית אושרה", "בתהליך אישור"]);
const DEPOSITED = new Set(["פרסום הפקדה", "בתהליך הפקדה"]);

// מחזיר Stage רק עבור הפקדה/אישור; אחרת null (מסונן החוצה).
function mapStage(status: unknown): Stage | null {
  const s = String(status ?? "").trim();
  if (APPROVED.has(s)) return "APPROVED";
  if (DEPOSITED.has(s)) return "DEPOSITED";
  return null;
}

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export const iplanConnector: Connector = {
  source: "IPLAN_PLAN",
  label: "תכניות מנהל התכנון (iplan)",

  async fetchRaw(): Promise<RawRecord[]> {
    const byPlan = new Map<string, RawRecord>();
    for (const where of WHERE_CLAUSES) {
      try {
        const features = await arcgisQueryAll({
          layerUrl: LAYER_URL,
          where,
          outFields: OUT_FIELDS,
          returnGeometry: true,
          outSR: 2039,
          pageSize: 1000,
          maxPages: 60,
        });
        for (const f of features) {
          const raw = featureToRaw(f);
          const key = String(raw.pl_number ?? "").trim();
          if (key) byPlan.set(key, raw); // מהדורה אחרונה גוברת
        }
      } catch {
        // סינון עברי שנחסם ע"י WAF לא מפיל את שאר השאילתות
      }
    }
    return [...byPlan.values()];
  },

  toLead(raw: RawRecord): NormalizedLead | null {
    const planNumber = String(raw.pl_number ?? "").trim();
    if (!planNumber) return null;

    const stage = mapStage(raw.internet_short_status);
    if (!stage) return null; // רק הפקדה/אישור

    const ll = geometryToLatLng(raw.__geometry);

    return {
      source: "IPLAN_PLAN",
      externalId: planNumber,
      title: (raw.pl_name as string) || `תכנית ${planNumber}`,
      url: (raw.pl_url as string) || null,
      address: null,
      city: (raw.plan_county_name as string) || null,
      block: null,
      parcel: null,
      lat: ll?.lat ?? null,
      lng: ll?.lng ?? null,
      stage,
      units: toInt(raw.pq_authorised_quantity_120),
      rawData: raw,
    };
  },
};
