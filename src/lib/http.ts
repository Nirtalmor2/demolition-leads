// עזר HTTP אחיד ל-connectors: retry עם backoff, headers תקינים (נגד WAF/403),
// timeout, וקידוד עברי תקין ב-query string.

export interface FetchJsonOptions {
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

const DEFAULT_HEADERS: Record<string, string> = {
  // user-agent של דפדפן אמיתי — חלק מ-WAF חוסמים בקשות ללא UA.
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "he,en;q=0.9",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET JSON עם retry/backoff. זורק אחרי שכל הניסיונות נכשלו. */
export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchJsonOptions = {}
): Promise<T> {
  const { retries = 3, backoffMs = 800, timeoutMs = 30_000, headers } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { ...DEFAULT_HEADERS, ...headers },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      // 403/429/5xx — שווה retry; אחר — נכשל מיד
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        // backoff מעריכי + jitter דטרמיניסטי (לפי attempt)
        const wait = backoffMs * 2 ** attempt + attempt * 137;
        await sleep(wait);
      }
    }
  }
  throw new Error(
    `fetchJson failed after ${retries + 1} attempts: ${String(lastErr)}`
  );
}

/** בונה query string עם קידוד עברי תקין. */
export function buildUrl(
  base: string,
  params: Record<string, string | number | undefined>
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${sp.toString()}`;
}
