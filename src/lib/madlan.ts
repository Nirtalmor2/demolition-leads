// חילוץ פרטי היזם מדף פרויקט במדלן + ניסיון איתור אוטומטי לפי כתובת.
// רקע: מדלן מוגן ב-PerimeterX שחוסם קריאות API/XHR, אבל מגיש את דף ה-HTML עצמו
// עם UA של דפדפן (HTTP 200). שם היזם מובנה ב-JSON שמוטמע בדף:
//   "developers":[{"id":...,"name":"קבוצת בן-דוד גלובלינקס","developerLink":"/developer/..."}]
// איתור אוטומטי: ה-slug של מדלן בנוי רחוב_מספר_עיר (אינשטיין_15_תל_אביב), אז אפשר
// לבנות מועמדים מכתובת הליד ולבדוק מי מהם קיים. לא כל ליד יימצא (כיסוי חלקי) —
// במקרה כזה נופלים-לאחור לאיתור ידני ב-UI.

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
};

export interface MadlanDeveloper {
  name: string;
  url: string | null; // עמוד היזם המלא במדלן
}

/** אימות שה-URL הוא דף פרויקט לגיטימי במדלן (הגנת SSRF). */
export function isMadlanProjectUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const okHost = host === "madlan.co.il" || host === "www.madlan.co.il";
    return u.protocol === "https:" && okHost && u.pathname.startsWith("/projects/");
  } catch {
    return false;
  }
}

// פענוח מחרוזת JSON שחולצה ב-regex (מטפל ב-\", \\, / וכו').
function decodeJsonString(captured: string): string {
  try {
    return JSON.parse(`"${captured}"`);
  } catch {
    return captured;
  }
}

// regex למחרוזת JSON שמכבד escapes (\" בתוך השם, למשל YBOX נדל"ן).
const jsonStr = (key: string) =>
  new RegExp(`"${key}":\\s*"((?:\\\\.|[^"\\\\])*)"`);

/** חילוץ היזם הראשון מתוך HTML של דף פרויקט. null אם אין יזם מוגדר. */
function extractDeveloper(html: string): MadlanDeveloper | null {
  const block = html.match(/"developers":\s*\[\s*\{([^}]*)\}/);
  if (!block) return null;
  const inner = block[1];
  const nameM = inner.match(jsonStr("name"));
  if (!nameM) return null;
  const name = decodeJsonString(nameM[1]).trim();
  if (!name) return null;
  const linkM = inner.match(jsonStr("developerLink"));
  const url = linkM
    ? new URL(decodeJsonString(linkM[1]), "https://www.madlan.co.il").href
    : null;
  return { name, url };
}

/** שגיאת חסימה של מדלן (PerimeterX, 403/429) — להבדיל מ"פרויקט לא קיים". */
export class MadlanBlockedError extends Error {}

// אם מוגדר מפתח ScraperAPI — כל הבקשות עוברות דרכו (פרוקסי residential + עקיפת
// PerimeterX), מה שמאפשר אמינות גם מ-Vercel. בלי מפתח — fetch ישיר (נחסם בקלות).
const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY;

function proxied(targetUrl: string): string {
  if (!SCRAPERAPI_KEY) return targetUrl;
  // ללא premium/ultra (לא זמין בתוכנית החינמית) וללא render — סבב ה-datacenter
  // כבר עוקף את ה-rate-limit-per-IP של מדלן (כל בקשה מ-IP אחר), וה-JSON של היזם
  // כבר ב-HTML שמוגש (SSR). אומת: מחזיר 200 + נתוני יזם.
  const params = new URLSearchParams({ api_key: SCRAPERAPI_KEY, url: targetUrl });
  return `https://api.scraperapi.com/?${params.toString()}`;
}

/** משיכת דף פרויקט. מחזיר HTML אם 200; null אם לא קיים; זורק MadlanBlockedError אם נחסם. */
async function fetchProjectHtml(projectUrl: string): Promise<string | null> {
  const res = await fetch(proxied(projectUrl), { headers: BROWSER_HEADERS, redirect: "follow" });

  if (SCRAPERAPI_KEY) {
    // דרך הפרוקסי: 401 = בעיית מפתח/תוכנית; שאר non-200 (404 מועמד שגוי / 500 כשל) → נסה הבא.
    if (res.status === 401) throw new MadlanBlockedError("ScraperAPI auth/plan error (401)");
    return res.ok ? res.text() : null;
  }

  // fetch ישיר (ללא מפתח): מדלן חוסם ב-403/429.
  if (res.status === 403 || res.status === 429) {
    throw new MadlanBlockedError(`madlan blocked (HTTP ${res.status})`);
  }
  return res.ok ? res.text() : null;
}

/**
 * מושך דף פרויקט במדלן (URL נתון) ומחלץ את היזם. זורק אם הדף לא נגיש.
 * משמש את מסלול האיתור הידני (הדבקת URL).
 */
export async function fetchMadlanDeveloper(
  projectUrl: string
): Promise<MadlanDeveloper | null> {
  const html = await fetchProjectHtml(projectUrl);
  if (html === null) throw new Error("madlan project not reachable");
  return extractDeveloper(html);
}

// ── איתור אוטומטי לפי כתובת — דרך חיפוש גוגל ממוקד-מדלן ──────────────────────
// מציאת דף הפרויקט (/projects/) דרך חיפוש גוגל מובנה (ScraperAPI), במקום ניחוש
// slug שברירי. מקבלים רק תוצאה שכותרתה תואמת את הרחוב + מספר הבית המדויק, ואז
// מחלצים את היזם המובנה מהדף. כך לא תופסים פרויקט שכן (מודיליאני 10 כשמבקשים 15)
// וגם לא מבלבלים אדריכל/מתווך עם יזם — שדה היזם במדלן מתויג מפורשות.

interface OrganicResult {
  title?: string;
  link?: string;
}

/** פירוק כתובת לרחוב + מספר בית (החלק שלפני הפסיק). null אם אין מספר. */
function parseStreetNumber(address: string): { street: string; num: string } | null {
  const first = address.split(",")[0].trim();
  const m = first.match(/^(.+?)\s+(\d+)\S*$/); // רחוב + מספר (מתעלם מסיומת אות "2ג")
  if (!m) return null;
  const street = m[1].replace(/["'״׳]/g, "").trim();
  return { street, num: m[2] };
}

/** האם כותרת תוצאת החיפוש מתייחסת בדיוק לרחוב + מספר המבוקשים. */
function titleMatchesAddress(title: string, street: string, num: string): boolean {
  // מספר הבית כטוקן עצמאי — ש-15 לא יתפוס "10" או "150".
  if (!new RegExp(`(?<!\\d)${num}(?!\\d)`).test(title)) return false;
  // כל מילות הרחוב המזהות חייבות להופיע בכותרת.
  const words = street.split(/\s+/).filter((w) => w.length >= 2);
  return words.length > 0 && words.every((w) => title.includes(w));
}

/** חיפוש גוגל מובנה דרך ScraperAPI (JSON נקי). [] אם אין מפתח/כשל. */
async function searchMadlan(query: string): Promise<OrganicResult[]> {
  if (!SCRAPERAPI_KEY) return [];
  const url =
    `https://api.scraperapi.com/structured/google/search` +
    `?api_key=${SCRAPERAPI_KEY}&country_code=il&num=10&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { organic_results?: OrganicResult[] };
  return data.organic_results ?? [];
}

/** וריאנטים של slug-עיר מתוך שדה העיר ("תל אביב-יפו" → "תל_אביב_יפו" + "תל_אביב"). */
function citySlugs(city: string | null): string[] {
  if (!city) return ["תל_אביב", "תל_אביב_יפו"];
  const base = city
    .replace(/["'״׳]/g, "")
    .replace(/-/g, " ")
    .trim()
    .replace(/\s+/g, "_");
  const set = new Set([base]);
  const parts = base.split("_");
  if (parts.length > 1) set.add(parts.slice(0, -1).join("_")); // בלי הסיומת ("יפו")
  return [...set];
}

/** מועמדי URL לפי slug ישיר (רחוב_מספר_עיר) — Hebrew גולמי (proxied/fetch יקודדו פעם אחת). */
function slugCandidates(street: string, num: string, city: string | null): string[] {
  const s = street.replace(/\s+/g, "_");
  return citySlugs(city).map(
    (c) => `https://www.madlan.co.il/projects/${s}_${num}_${c}`
  );
}

/** מסלול גוגל: מאתר דף /projects/ שכותרתו תואמת בדיוק את הכתובת. */
async function resolveViaSearch(
  street: string,
  num: string,
  city: string | null
): Promise<string | null> {
  const query = `site:madlan.co.il ${street} ${num} ${city ?? ""} פרויקט`;
  const results = await searchMadlan(query);
  const match = results.find(
    (r) =>
      r.link &&
      r.link.includes("/projects/") &&
      titleMatchesAddress(r.title ?? "", street, num)
  );
  if (!match?.link) return null;
  // גוגל מצרף לעיתים query-string (?term=…&tracking=…); משאירים path בלבד, ומפענחים
  // ל-UTF-8 גולמי כדי שהשליפה תקודד פעם אחת בלבד (ללא double-encode).
  try {
    const u = new URL(match.link);
    return "https://www.madlan.co.il" + decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
}

/**
 * מאתר אוטומטית את דף הפרויקט במדלן לכתובת ומחלץ את היזם.
 * (1) חיפוש גוגל ממוקד — תופס גם slug לא-צפוי; (2) בניית slug ישיר — תופס
 * פרויקטים שגוגל מדרג נמוך (רחוב נפוץ בכמה ערים). null אם אין פרויקט תואם.
 * זורק MadlanBlockedError אם השליפה נחסמה.
 */
export async function resolveMadlanByAddress(
  address: string,
  city: string | null
): Promise<{ projectUrl: string; developer: MadlanDeveloper } | null> {
  const parsed = parseStreetNumber(address);
  if (!parsed) return null;
  const { street, num } = parsed;

  const candidates: string[] = [];
  const viaSearch = await resolveViaSearch(street, num, city);
  if (viaSearch) candidates.push(viaSearch);
  candidates.push(...slugCandidates(street, num, city));

  for (const projectUrl of candidates) {
    const html = await fetchProjectHtml(projectUrl);
    if (html === null) continue;
    const developer = extractDeveloper(html);
    if (developer) return { projectUrl, developer };
  }
  return null;
}
