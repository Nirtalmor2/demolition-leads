// סקריפט CLI להרצת ingest מהטרמינל (ללא שרת web). שימוש:
//   npx tsx scripts/ingest.ts            — כל המקורות
//   npx tsx scripts/ingest.ts URBAN_RENEWAL — מקור בודד
import { CONNECTORS, getConnector } from "../src/lib/connectors";
import { runConnectors } from "../src/lib/ingest";
import { runCrossSourceDedup } from "../src/lib/dedup";
import type { Source } from "../src/lib/domain";

async function main() {
  const arg = process.argv[2] as Source | undefined;
  const connectors = arg ? [getConnector(arg)].filter(Boolean as never) : CONNECTORS;

  console.log(`▶ מריץ ${connectors.length} connector(s)...`);
  const t0 = Date.now();
  const results = await runConnectors(connectors as never);
  for (const r of results) {
    console.log(
      `  ${r.source}: total=${r.total} created=${r.created} updated=${r.updated} errors=${r.errors} — ${r.message ?? ""}`
    );
  }

  console.log("▶ dedup חוצה-מקורות...");
  const dedup = await runCrossSourceDedup();
  console.log(`  קבוצות כפילות: ${dedup.groups}, סומנו: ${dedup.marked}`);

  console.log(`✓ הסתיים ב-${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(0);
}

main().catch((e) => {
  console.error("✗ כשל:", e);
  process.exit(1);
});
