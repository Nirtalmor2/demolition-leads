// Connector — בקשות/היתרי הריסה, תל אביב-יפו (DEMOLITION_PERMIT).
// מקור עדכני מאוד (מתעדכן יומית) של עיריית ת"א — שכבת בקשות בנייה (IView2/772),
// מסונן רק לבקשות שכוללות הריסה (sug_bakasha LIKE '%הריסה%'), ועדכניות/בתהליך בלבד.
// סיגנל "חם": הריסה קרובה/ודאית. גאומטריה פוליגון ITM (2039).
import { arcgisQueryAll, featureToRaw } from "./arcgis";
import { geometryToLatLng } from "@/lib/geo";
import type { Connector, RawRecord } from "./types";
import type { NormalizedLead } from "@/lib/domain";

const LAYER_URL =
  "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/772";

// רק בקשות הריסה, ורק כאלה שבתהליך (ללא היתר עדיין) או שההיתר ניתן מ-2022 ואילך.
const WHERE =
  "sug_bakasha LIKE '%הריסה%' AND " +
  "(permission_date IS NULL OR permission_date >= timestamp '2022-01-01 00:00:00')";

const OUT_FIELDS = [
  "request_num",
  "permission_num",
  "permission_date",
  "expiry_date",
  "open_request",
  "tr_hathalat_bniya",
  "building_num",
  "ms_tik_binyan",
  "addresses",
  "sug_bakasha",
  "tochen_bakasha",
  "koteret",
  "maslul_rishuy",
  "request_stage",
  "building_stage",
  "yechidot_diyur",
  "sw_tama_38",
  "sw_tama_38_chadash",
  "sw_tama_38_tosefet",
  "hakala_yd_mevukash",
  "hakala_melel",
  "url_hadmaya",
].join(",");

const CITY = "תל אביב-יפו";

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export const demolitionPermitConnector: Connector = {
  source: "DEMOLITION_PERMIT",
  label: "בקשות הריסה — תל אביב",

  async fetchRaw(): Promise<RawRecord[]> {
    const features = await arcgisQueryAll({
      layerUrl: LAYER_URL,
      where: WHERE,
      outFields: OUT_FIELDS,
      returnGeometry: true,
      outSR: 2039,
      pageSize: 1000,
    });
    return features.map(featureToRaw);
  },

  toLead(raw: RawRecord): NormalizedLead | null {
    const reqNum = String(raw.request_num ?? "").trim();
    if (!reqNum) return null;

    const address = (raw.addresses as string) || null;
    const stageText = (raw.building_stage as string) || "";
    const ll = geometryToLatLng(raw.__geometry);

    // חילוץ פרטי ההריסה מתוך תוכן הבקשה (טקסט חופשי) — קומות ושטח להריסה.
    const tochen = String(raw.tochen_bakasha ?? "");
    const floorsM = tochen.match(/קומות להריסה[^\d]*(\d+)/);
    const areaM = tochen.match(/שטח הריסה[^\d]*([\d.]+)/);
    if (floorsM) raw.demolition_floors = Number(floorsM[1]);
    if (areaM) raw.demolition_area = Math.round(Number(areaM[1]));

    const titleParts = ["בקשת הריסה"];
    if (address) titleParts.push(`— ${address}`);
    if (stageText) titleParts.push(`(${stageText})`);

    return {
      source: "DEMOLITION_PERMIT",
      externalId: `${CITY}:${reqNum}`,
      title: titleParts.join(" "),
      url: (raw.url_hadmaya as string) || null,
      address,
      city: CITY,
      block: null,
      parcel: null,
      lat: ll?.lat ?? null,
      lng: ll?.lng ?? null,
      stage: "DEMOLITION_PERMIT",
      units: toInt(raw.yechidot_diyur),
      rawData: raw,
    };
  },
};
