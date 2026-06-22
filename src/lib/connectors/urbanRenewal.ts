// Connector 1 — התחדשות עירונית (URBAN_RENEWAL). ערך הכי גבוה (סעיף 6.1).
// מקור: שכבת "מתחמי פינוי בינוי מוכרזים" של הרשות הממשלתית להתחדשות עירונית
// (FeatureServer ציבורי של משרד השיכון ב-ArcGIS Online, ללא token). גאומטריה ITM (2039).
import { arcgisQueryAll, featureToRaw } from "./arcgis";
import { geometryToLatLng } from "@/lib/geo";
import type { Connector, RawRecord } from "./types";
import type { NormalizedLead, Stage } from "@/lib/domain";

const LAYER_URL =
  "https://services6.arcgis.com/I08Ekaykft5ELucH/arcgis/rest/services/GIS_UrbanRenewal/FeatureServer/1";

// codeStatusHarashut: 1=תכנון ראשוני, 2=תכנון סטטוטורי, 3=מאושרת לפני מימוש, 4=מאושרת במימוש
function mapStage(code: unknown): Stage {
  switch (Number(code)) {
    case 4:
    case 3:
      return "APPROVED";
    case 2:
      return "DEPOSITED";
    case 1:
    default:
      return "PLANNING";
  }
}

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export const urbanRenewalConnector: Connector = {
  source: "URBAN_RENEWAL",
  label: "התחדשות עירונית — מתחמי פינוי בינוי",

  async fetchRaw(): Promise<RawRecord[]> {
    const features = await arcgisQueryAll({
      layerUrl: LAYER_URL,
      where: "1=1",
      outFields: "*",
      returnGeometry: true,
      outSR: 2039,
      pageSize: 1000,
    });
    return features.map(featureToRaw);
  },

  toLead(raw: RawRecord): NormalizedLead | null {
    const id = raw.MisparProject ?? raw.OBJECTID;
    if (id === undefined || id === null) return null;

    const name = (raw.ShemMitcham as string) || "מתחם התחדשות";
    const city = (raw.Yeshuv as string) || null;
    const track = (raw.TeurMaslul as string) || "";
    const stage = mapStage(raw.codeStatusHarashut);
    const units =
      toInt(raw.yachadMutzaRashut) ??
      toInt(raw.YachadTosafti) ??
      toInt(raw.yachadKayamRashut);

    const ll = geometryToLatLng(raw.__geometry);

    const titleParts = [name];
    if (track) titleParts.push(`(${track})`);

    return {
      source: "URBAN_RENEWAL",
      externalId: String(id),
      title: titleParts.join(" "),
      url: (raw.Kishur as string) || null,
      address: null,
      city,
      block: null,
      parcel: null,
      lat: ll?.lat ?? null,
      lng: ll?.lng ?? null,
      stage,
      units,
      rawData: raw,
    };
  },
};
