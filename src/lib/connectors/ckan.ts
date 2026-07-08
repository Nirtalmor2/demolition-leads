// עזר גנרי ל-CKAN datastore_search (data.gov.il) עם pagination ב-offset.
// הערה ארצית: תקרת offset ~32k — ל-POC מספיק; בעתיד לעבור ל-cursor/סינון תאריך.
import { buildUrl, fetchJson } from "@/lib/http";
import type { RawRecord } from "./types";

interface CkanResponse {
  success: boolean;
  result?: {
    records?: RawRecord[];
    total?: number;
    fields?: { id: string; type: string }[];
  };
  error?: unknown;
}

export interface CkanSearchOptions {
  /** בסיס ה-API; ברירת מחדל data.gov.il */
  baseUrl?: string;
  /** resource_id של המאגר */
  resourceId: string;
  /** חיפוש טקסט חופשי (q) — מקודד עברית אוטומטית */
  q?: string;
  /** סינון שדות מדויק */
  filters?: Record<string, string>;
  pageSize?: number;
  maxPages?: number;
}

const DEFAULT_BASE = "https://data.gov.il/api/3/action/datastore_search";

/** מושך את כל הרשומות ממאגר CKAN עם pagination. */
export async function ckanSearchAll(
  opts: CkanSearchOptions
): Promise<RawRecord[]> {
  const {
    baseUrl = DEFAULT_BASE,
    resourceId,
    q,
    filters,
    pageSize = 1000,
    maxPages = 50,
  } = opts;

  const all: RawRecord[] = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const url = buildUrl(baseUrl, {
      resource_id: resourceId,
      q,
      filters: filters ? JSON.stringify(filters) : undefined,
      limit: pageSize,
      offset,
    });

    const data = await fetchJson<CkanResponse>(url);
    if (!data.success) {
      throw new Error(`CKAN error: ${JSON.stringify(data.error)}`);
    }
    const records = data.result?.records ?? [];
    all.push(...records);

    const total = data.result?.total ?? all.length;
    offset += records.length;
    if (records.length === 0 || offset >= total) break;
    if (offset >= 32_000) break; // תקרת offset של CKAN
  }

  return all;
}
