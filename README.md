# Niro — מערכת לידים להריסות + CRM (POC)

מערכת שמושכת אוטומטית בניינים/מתחמים שצפויים להריסה **לפני** שלב היתר ההריסה,
משלושה מקורות ממשלתיים פתוחים ועדכניים, מנרמלת לגוש/חלקה+מיקום, מתייגת בדחיפות, ומציגה
ב‑CRM עם מפה ו‑Kanban. **סקופ: כל הארץ.**

> POC על **PostgreSQL**. להעלאה ל-Vercel (ללא GitHub) ראו [DEPLOY.md](DEPLOY.md).
> לפיתוח מקומי אפשר להרים Postgres ב-Docker: `docker compose up -d`.

## הרצה מהירה

```bash
npm install
# הגדר DATABASE_URL ב-.env (אותה כתובת גם ל-Vercel — ראו .env.example / DEPLOY.md)
npm run db:deploy             # יוצר את הטבלאות במסד
npm run ingest                # מושך לידים אמיתיים מכל 3 המקורות + dedup
npm run dev                   # מריץ את האפליקציה (http://localhost:3000)
```

- `npm run ingest` — כל המקורות. `npm run ingest URBAN_RENEWAL` — מקור בודד.
- `npm run db:studio` — דפדפן ל-DB.

## ארכיטקטורה

```
fetchRaw() → toLead() → validate(zod) → geo(proj4 ITM→WGS84) → score() → upsert(dedup)
```

| רכיב | מימוש |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| DB / ORM | PostgreSQL + Prisma |
| מפה | MapLibre GL (CARTO raster, ללא מפתח) |
| קואורדינטות | proj4 — ITM (EPSG:2039) → WGS84 |
| UI | עוצב דרך הסקיל `ui pro max` (Data-Dense Dashboard, RTL עברית) |

קוד מרכזי: `src/lib/connectors/*` (מקורות), `src/lib/ingest.ts` (צינור),
`src/lib/dedup.ts` (איחוד חוצה-מקורות), `src/lib/geo.ts` (proj4), `src/components/*` (CRM).

## מקורות הנתונים (מאומתים, ללא token)

| מקור | endpoint | סוג |
|---|---|---|
| התחדשות עירונית | `services6.arcgis.com/.../GIS_UrbanRenewal/FeatureServer/1` | ArcGIS (פוליגון, ITM) |
| תכניות iplan | `ags.iplan.gov.il/arcgisiplan/.../Xplan/MapServer/1` | ArcGIS (פוליגון, ITM) |
| מבנים מסוכנים | `gisn.tel-aviv.gov.il/.../IView2/MapServer/591` | ArcGIS (נקודה) |

מבנים מסוכנים: config-driven (`src/lib/connectors/dangerousBuildings.ts`) —
הוספת רשות = הוספת אובייקט למערך, לא קוד.

## ניקוד דחיפות (score)

| שלב | Score | צבע |
|---|---|---|
| הוכרז מסוכן | 90 | אדום |
| תכנית מאושרת | 60 | ענבר |
| תכנית שהופקדה | 50 | כחול |
| תכנון מוקדם | 30 | אפור |

בונוס קטן לפי מס' יח"ד (תקרה 100).

## תזמון אוטומטי

`GET /api/cron/ingest` מריץ את כל ה-connectors + dedup ורושם ל-`IngestRun`.

- **Vercel Cron:** מוגדר ב-[`vercel.json`](vercel.json) — יומי ב-03:00.
- **GitHub Actions:** [`.github/workflows/ingest.yml`](.github/workflows/ingest.yml) — חלופה לכל אירוח.
- אבטחה אופציונלית: הגדרת `CRON_SECRET` ב-env מחייבת `Authorization: Bearer <secret>`.

## Roadmap (אחרי POC)

1. שכבת PostGIS ל-dedup מרחבי בתוך ה-DB (כרגע ברמת האפליקציה; ה-DB כבר PostgreSQL).
2. השלמת גוש/חלקה חסר דרך שכבת חלקות לאומית (spatial query).
3. govmap (token) להעשרת כתובת↔גוש/חלקה — לכשיהיה דומיין חי.
4. היתרי הריסה עירוניים (זחילה), מכרזי רשויות מקומיות.
5. התראות בזמן אמת, ריבוי משתמשים, העשרת לידים.
