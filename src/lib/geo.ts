// המרת קואורדינטות ITM (Israel TM Grid, EPSG:2039) → WGS84 (lat/lng).
// proj4 הוא ספריית מתמטיקה טהורה — ללא token, ללא רשת.
import proj4 from "proj4";

// הגדרת EPSG:2039 — Israeli TM Grid (datum Israel 1993 / GRS80, towgs84 מדויק).
const ITM =
  "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 " +
  "+k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 " +
  "+towgs84=-24.0024,-17.1032,-17.8444,-0.33077,-1.85269,1.66969,5.4262 +units=m +no_defs";

const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

export interface LatLng {
  lat: number;
  lng: number;
}

// גבולות גסים של ITM בישראל — לזיהוי קואורדינטות שכבר ב-WGS84 או פגומות.
const ITM_X_MIN = 100_000;
const ITM_X_MAX = 320_000;
const ITM_Y_MIN = 350_000;
const ITM_Y_MAX = 850_000;

/** האם הזוג נראה כמו ITM (מטרים) ולא כמו lng/lat (מעלות). */
export function looksLikeItm(x: number, y: number): boolean {
  return (
    x >= ITM_X_MIN &&
    x <= ITM_X_MAX &&
    y >= ITM_Y_MIN &&
    y <= ITM_Y_MAX
  );
}

/** המרת נקודת ITM (x=easting, y=northing במטרים) ל-WGS84. */
export function itmToWgs84(x: number, y: number): LatLng {
  const [lng, lat] = proj4(ITM, WGS84, [x, y]);
  return { lat, lng };
}

/**
 * נקודה גמישה: מקבלת זוג שעשוי להיות ITM או כבר WGS84, ומחזירה lat/lng.
 * מחזיר null אם הערכים לא חוקיים.
 */
export function toWgs84(x: number, y: number): LatLng | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (looksLikeItm(x, y)) return itmToWgs84(x, y);
  // כבר נראה כמו מעלות (lng,lat) — בתחום ישראל בערך
  if (x >= 33 && x <= 37 && y >= 29 && y <= 34) return { lat: y, lng: x };
  return null;
}

/**
 * חישוב צנטרואיד של גאומטריית ArcGIS (point/polygon/polyline) והמרה ל-WGS84.
 * תומך ב: {x,y} | {rings:[[[x,y]...]]} | {paths:[[[x,y]...]]}.
 */
export function geometryToLatLng(geometry: unknown): LatLng | null {
  if (!geometry || typeof geometry !== "object") return null;
  const g = geometry as Record<string, unknown>;

  // נקודה
  if (typeof g.x === "number" && typeof g.y === "number") {
    return toWgs84(g.x, g.y);
  }

  // פוליגון (rings) או קו (paths) — לוקחים צנטרואיד פשוט של כל הקודקודים
  const coordsSource = (g.rings ?? g.paths) as number[][][] | undefined;
  if (Array.isArray(coordsSource)) {
    let sumX = 0;
    let sumY = 0;
    let n = 0;
    for (const ring of coordsSource) {
      for (const pt of ring) {
        if (Array.isArray(pt) && pt.length >= 2) {
          sumX += pt[0];
          sumY += pt[1];
          n++;
        }
      }
    }
    if (n === 0) return null;
    return toWgs84(sumX / n, sumY / n);
  }

  return null;
}

/** מרחק הברסיין במטרים בין שתי נקודות WGS84 — לשימוש ב-dedup מרחבי. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
