import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { STYLE_IDS, type StyleId } from "@/lib/v3/styles";

export const dynamic = "force-dynamic";

/**
 * How many v3 responses have each style, for "How common" on style pages.
 * Cached for an hour in memory and by the CDN.
 */
let cache: { at: number; body: { total: number; counts: Record<StyleId, number> } } | null = null;
const HOUR = 60 * 60 * 1000;

export async function GET() {
  if (!cache || Date.now() - cache.at > HOUR) {
    const db = await getDb();
    const rows = await db
      .select({ style: schema.responses.style, n: count() })
      .from(schema.responses)
      .where(eq(schema.responses.questionnaireVersion, "3"))
      .groupBy(schema.responses.style);
    const counts = Object.fromEntries(STYLE_IDS.map((s) => [s, 0])) as Record<StyleId, number>;
    for (const r of rows) counts[r.style] = r.n;
    cache = { at: Date.now(), body: { total: rows.reduce((a, r) => a + r.n, 0), counts } };
  }
  return Response.json(cache.body, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } });
}
