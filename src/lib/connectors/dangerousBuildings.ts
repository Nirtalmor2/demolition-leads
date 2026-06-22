// Connector 2 — מבנים מסוכנים (DANGEROUS_BUILDING). ליד חם (סעיף 6.2).
// מתחיל חלקי: רשויות עם Open Data טוב. הרחבת רשות = הוספת config (לא קוד).
// מקור ראשון: תל אביב-יפו, שכבת ArcGIS ציבורית (IView2/591). נקודות.
import { arcgisQueryAll, featureToRaw } from "./arcgis";
import { geometryToLatLng } from "@/lib/geo";
import type { Connector, RawRecord } from "./types";
import type { NormalizedLead } from "@/lib/domain";

// ── config של רשויות — הוספת רשות = עוד אובייקט במערך ──────────────────────
interface MunicipalityConfig {
  city: string;
  layerUrl: string;
  /** האם השכבה מחזירה גאומטריה ב-WGS84 ישירות (outSR=4326) */
  outSR: number;
  fields: {
    id: string;
    address: string;
    orderType?: string;
    findings?: string;
  };
}

const MUNICIPALITIES: MunicipalityConfig[] = [
  {
    city: "תל אביב-יפו",
    layerUrl:
      "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/591",
    outSR: 4326, // השרת ממיר ל-WGS84 ישירות
    fields: {
      id: "UniqueId",
      address: "t_ktovet",
      orderType: "t_tzav",
      findings: "t_mimzaim",
    },
  },
  // דוגמה להרחבה (כשיימצא מקור): { city: "חיפה", layerUrl: "...", outSR: 2039, fields: {...} }
];

// ה-connector מאחד את כל הרשויות שב-config. כל רשומה נושאת __city + __cfg לנירמול.
export const dangerousBuildingsConnector: Connector = {
  source: "DANGEROUS_BUILDING",
  label: "מבנים מסוכנים (רשויות מקומיות)",

  async fetchRaw(): Promise<RawRecord[]> {
    const out: RawRecord[] = [];
    for (const cfg of MUNICIPALITIES) {
      try {
        const features = await arcgisQueryAll({
          layerUrl: cfg.layerUrl,
          where: "1=1",
          outFields: "*",
          returnGeometry: true,
          outSR: cfg.outSR,
          pageSize: 1000,
        });
        for (const f of features) {
          const raw = featureToRaw(f);
          raw.__city = cfg.city;
          raw.__fields = cfg.fields;
          out.push(raw);
        }
      } catch {
        // רשות שנכשלה לא מפילה את השאר
      }
    }
    return out;
  },

  toLead(raw: RawRecord): NormalizedLead | null {
    const f = raw.__fields as MunicipalityConfig["fields"] | undefined;
    const city = (raw.__city as string) || null;
    if (!f) return null;

    const localId = String(raw[f.id] ?? "").trim();
    if (!localId) return null;

    const address = (raw[f.address] as string) || null;
    const orderType = f.orderType ? (raw[f.orderType] as string) : "";

    const ll = geometryToLatLng(raw.__geometry);

    const titleParts = ["מבנה מסוכן"];
    if (address) titleParts.push(`— ${address}`);
    else if (city) titleParts.push(`— ${city}`);

    return {
      source: "DANGEROUS_BUILDING",
      externalId: `${city}:${localId}`, // dedup key (סעיף 6.2)
      title: titleParts.join(" ") + (orderType ? ` (${orderType})` : ""),
      url: null,
      address,
      city,
      block: null,
      parcel: null,
      lat: ll?.lat ?? null,
      lng: ll?.lng ?? null,
      stage: "DANGEROUS_DECLARED",
      units: null,
      rawData: raw,
    };
  },
};
