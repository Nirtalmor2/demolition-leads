// עזר גנרי למשיכת שכבות ArcGIS REST עם pagination (resultOffset/resultRecordCount).
import { buildUrl, fetchJson } from "@/lib/http";
import type { RawRecord } from "./types";

export interface ArcgisFeature {
  attributes: Record<string, unknown>;
  geometry?: unknown;
}

interface ArcgisQueryResponse {
  features?: ArcgisFeature[];
  exceededTransferLimit?: boolean;
  error?: { code: number; message: string };
}

export interface ArcgisQueryOptions {
  /** ה-URL של שכבת ה-FeatureLayer (ללא /query) */
  layerUrl: string;
  where?: string;
  outFields?: string;
  /** האם להחזיר גאומטריה */
  returnGeometry?: boolean;
  /** מערכת קואורדינטות יעד; ברירת מחדל 2039 (ITM) כפי שמגיע מהמקור */
  outSR?: number;
  pageSize?: number;
  /** תקרת ביטחון למספר עמודים (מונע לולאה אינסופית ב-POC) */
  maxPages?: number;
}

/**
 * מושך את כל ה-features משכבת ArcGIS עם pagination.
 * עוצר כש-exceededTransferLimit=false או כשמתקבל עמוד ריק.
 */
export async function arcgisQueryAll(
  opts: ArcgisQueryOptions
): Promise<ArcgisFeature[]> {
  const {
    layerUrl,
    where = "1=1",
    outFields = "*",
    returnGeometry = true,
    outSR = 2039,
    pageSize = 1000,
    maxPages = 100,
  } = opts;

  const queryUrl = layerUrl.endsWith("/query")
    ? layerUrl
    : `${layerUrl}/query`;

  const all: ArcgisFeature[] = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const url = buildUrl(queryUrl, {
      where,
      outFields,
      returnGeometry: returnGeometry ? "true" : "false",
      outSR,
      f: "json",
      resultOffset: offset,
      resultRecordCount: pageSize,
    });

    const data = await fetchJson<ArcgisQueryResponse>(url);
    if (data.error) {
      throw new Error(`ArcGIS error ${data.error.code}: ${data.error.message}`);
    }
    const feats = data.features ?? [];
    all.push(...feats);

    // סיום: פחות מעמוד מלא, או שהשירות סימן שאין עוד
    if (feats.length < pageSize && !data.exceededTransferLimit) break;
    if (feats.length === 0) break;
    offset += feats.length;
  }

  return all;
}

/** המרת feature ל-RawRecord אחיד (attributes + __geometry שמור בנפרד). */
export function featureToRaw(f: ArcgisFeature): RawRecord {
  return { ...f.attributes, __geometry: f.geometry ?? null };
}
