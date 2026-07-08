// איתור יזם של פרויקט לפי כתובת:
//   1) חיפוש רשת — ScraperAPI → Google מובנה (JSON), עוקף חסימות.
//   2) חילוץ היזם מתוך התוצאות — Gemini (REST, מפתח חינמי), שמבין את הטקסט
//      ומבחין בין יזם לבין ועדת-תכנון/מתווך/פרויקט שכן. נפילה-לאחור: היוריסטיקה.

const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// gemini-2.5-flash: מאגר מכסה חינמי נפרד (ה-flash/flash-lite מוצו), איכות טובה למשימה. ניתן לעקוף ב-.env.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface DeveloperHit {
  name: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
}

interface OrganicResult {
  title?: string;
  snippet?: string;
  link?: string;
}

// ── 1) חיפוש רשת ───────────────────────────────────────────────────────────

function buildQuery(address: string, city: string | null): string {
  const first = address.split(",")[0].trim();
  return [first, city, "יזם פרויקט"].filter(Boolean).join(" ");
}

async function searchResults(query: string): Promise<OrganicResult[]> {
  if (!SCRAPERAPI_KEY) throw new Error("SCRAPERAPI_KEY missing");
  const url =
    `https://api.scraperapi.com/structured/google/search` +
    `?api_key=${SCRAPERAPI_KEY}&country_code=il&num=15&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`search failed (HTTP ${res.status})`);
  const data = (await res.json()) as { organic_results?: OrganicResult[] };
  return data.organic_results ?? [];
}

// ── 2a) חילוץ עם Gemini (מדויק) ────────────────────────────────────────────

// שגיאות חולפות שכדאי לנסות-שוב עליהן:
//   429 = rate-limit דקתי (נכבד retryDelay של Google); 500/502/503 = המודל עמוס
//   זמנית ("model is overloaded", שכיח ב-tier החינמי) → backoff מעריך.
const GEMINI_RETRYABLE = new Set([429, 500, 502, 503]);
const GEMINI_MAX_ATTEMPTS = 3;

/** קריאה ל-Gemini עם ניסיון-חוזר על שגיאות חולפות (429/5xx) עם backoff. */
async function geminiGenerate(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    // maxOutputTokens גבוה: מודלי-thinking (2.5) צורכים tokens ל"חשיבה" לפני הפלט,
    // ו-200 לא הספיקו אפילו ל-JSON הקצר. parseLoose מחלץ את ה-JSON גם אם יש הקדמת-פרוזה.
    generationConfig: { temperature: 0, maxOutputTokens: 1024, responseMimeType: "application/json" },
  });

  let lastStatus = 0;
  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }
    lastStatus = res.status;
    const isLast = attempt === GEMINI_MAX_ATTEMPTS - 1;
    if (!GEMINI_RETRYABLE.has(res.status) || isLast) {
      throw new Error(`gemini failed (HTTP ${res.status})`);
    }
    // 429: נכבד את retryDelay של Google. 5xx (עומס): backoff מעריך 2s,4s,8s.
    let waitSec = Math.min(2 ** (attempt + 1), 12);
    if (res.status === 429) {
      const err = (await res.json().catch(() => null)) as {
        error?: { details?: { "@type"?: string; retryDelay?: string }[] };
      } | null;
      const ri = err?.error?.details?.find((d) => String(d["@type"]).endsWith("RetryInfo"));
      waitSec = Math.min(parseInt(ri?.retryDelay ?? "15", 10) || 15, 20);
    }
    await new Promise((r) => setTimeout(r, waitSec * 1000));
  }
  throw new Error(`gemini failed (HTTP ${lastStatus})`);
}

async function extractWithGemini(
  address: string,
  city: string | null,
  results: OrganicResult[]
): Promise<DeveloperHit | null> {
  // פרומפט מצומצם (5 תוצאות, תקצירים קצוצים) — חוסך input-tokens מול מכסת ה-tier החינמי.
  const resultsText = results
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title ?? ""}\n${(r.snippet ?? "").slice(0, 220)}\n${r.link ?? ""}`)
    .join("\n\n");

  const prompt =
    `להלן תוצאות חיפוש גוגל על פרויקט בנייה/נדל"ן בכתובת "${address}, ${city ?? ""}" בישראל.\n` +
    `זהה את חברת היזם של הפרויקט שבכתובת הזו בלבד.\n` +
    `כללים מחייבים:\n` +
    `- החזר רק שם חברה ספציפי (למשל "אורון נדל\\"ן בע\\"מ", "קבוצת תדהר"). אם יש רק ביטוי כללי כמו "יזמות והתחדשות עירונית" או "פינוי בינוי" — זה לא שם חברה, החזר null.\n` +
    `- ודא שמספר הבית בתוצאה תואם בדיוק לכתובת המבוקשת. אם התוצאה מתייחסת למספר בית אחר באותו רחוב — התעלם ממנה.\n` +
    `- אל תחזיר ועדת תכנון/עירייה, עורך דין, מתווך, אדריכל, או יזם של כתובת אחרת.\n` +
    `החזר JSON: {"developer":"<שם החברה בעברית, כולל בע\\"מ אם מופיע>","source":<מספר התוצאה>}\n` +
    `אם אין יזם ברור לכתובת הזו: {"developer":null,"source":null}\n\n` +
    `תוצאות:\n${resultsText}`;

  const text = await geminiGenerate(prompt);

  // חלק מהמודלים (למשל 2.5-flash) מתעלמים מ-responseMimeType ומחזירים JSON עטוף בפרוזה —
  // לכן חילוץ עמיד: ישיר → בלי code-fences → בלוק {…} הראשון בטקסט.
  const parseLoose = (s: string): { developer?: string | null; source?: number | null } | null => {
    for (const c of [s, s.replace(/```json|```/g, "").trim(), s.match(/\{[\s\S]*\}/)?.[0] ?? ""]) {
      if (!c) continue;
      try {
        return JSON.parse(c);
      } catch {
        /* נסה את הצורה הבאה */
      }
    }
    return null;
  };
  const parsed = parseLoose(text);
  if (!parsed?.developer) return null;

  // משמר מפני אי-ציות: Gemini מחזיר לעיתים ביטוי-קטגוריה במקום שם חברה.
  const GENERIC =
    /^(יזמות והתחדשות עירונית|התחדשות עירונית|פינוי[ -]?בינוי|יזמות נדל"?ן|נדל"?ן|תמ"?א 38|יזמות|בנייה|התחדשות)$/;
  const name0 = String(parsed.developer).trim();
  if (GENERIC.test(name0)) return null;

  const idx = Number(parsed.source) - 1;
  const src = idx >= 0 && results[idx] ? results[idx] : results[0];
  return {
    name: String(parsed.developer).trim(),
    sourceUrl: src?.link ?? null,
    sourceTitle: src?.title ?? null,
  };
}

// ── 2b) חילוץ היוריסטי (נפילה-לאחור, ללא מפתח Gemini) ──────────────────────

const DEV_SUFFIX = /(בע"?מ|נדל"?ן|יזמות|יזום|בנייה|בניה|התחדשות|אחזקות|השקעות)/;
const BLOCKLIST =
  /(לא סיפק|מידע נוסף|ושות|עו"?ד|עורכ?י? דין|תיווך|כב"?כ|בעלים|למכירה|דירות חדשות|ועדה מקומית|תכנון ובניה|עיריי)/;

function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–•|·:]+/, "")
    .replace(/[\s\-–•|·.,]+$/, "")
    .trim();
}

function looksLikeDeveloper(name: string): boolean {
  if (name.length < 3 || name.length > 50) return false;
  if (BLOCKLIST.test(name)) return false;
  return DEV_SUFFIX.test(name) || /^קבוצת\s/.test(name);
}

function heuristicPick(results: OrganicResult[]): DeveloperHit | null {
  const score = new Map<string, number>();
  const source = new Map<string, OrganicResult>();
  const add = (cand: string, r: OrganicResult, w: number) => {
    if (!looksLikeDeveloper(cand)) return;
    score.set(cand, (score.get(cand) ?? 0) + w);
    if (!source.has(cand)) source.set(cand, r);
  };

  results.forEach((r, idx) => {
    const t = `${r.title ?? ""}\n${r.snippet ?? ""}`;
    const w = idx < 3 ? 2 : 1;
    for (const m of t.matchAll(/יזם[:\s]\s*([^\n•|·]+)/g)) {
      let c = m[1];
      const sm = c.match(new RegExp(`^(.*?${DEV_SUFFIX.source})`));
      if (sm) c = sm[1];
      add(cleanName(c.split(/[.,]/)[0]), r, w + 1); // סיגנל "יזם:" חזק יותר
    }
    for (const m of t.matchAll(/[|│]\s*([^|│\n]+?)\s*(?:$|\n)/g)) add(cleanName(m[1]), r, w);
    for (const m of t.matchAll(/(קבוצת\s+[֐-׿'\-]+(?:\s+[֐-׿'\-]+){0,2})/g)) add(cleanName(m[1]), r, w);
  });

  if (score.size === 0) return null;
  const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const src = source.get(best);
  return { name: best, sourceUrl: src?.link ?? null, sourceTitle: src?.title ?? null };
}

// ── orchestrator ───────────────────────────────────────────────────────────

/**
 * מאתר את יזם הפרויקט בכתובת. null אם לא נמצא.
 * משתמש ב-Gemini לחילוץ מדויק אם GEMINI_API_KEY מוגדר; אחרת היוריסטיקה.
 */
export async function lookupDeveloper(
  address: string,
  city: string | null
): Promise<DeveloperHit | null> {
  const results = await searchResults(buildQuery(address, city));
  if (results.length === 0) return null;

  // עם מפתח Gemini — חילוץ מדויק; כשל (כולל 429 rate-limit) מתפרסם החוצה כדי
  // שה-UI יבקש לנסות שוב, במקום להחזיר ניחוש היוריסטי חלש בשקט.
  if (GEMINI_API_KEY) {
    return extractWithGemini(address, city, results);
  }
  // ללא מפתח — היוריסטיקה כ-best-effort.
  return heuristicPick(results);
}
