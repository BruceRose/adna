import "server-only";
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { NewResponse, ResponseMeta } from "./db/schema";
import type { Preferences } from "./v3/items";
import { retentionCutoff } from "./retention";

const { responses } = schema;

export interface ResponseFilters {
  q?: string;
  industry?: string;
  event?: string;
  style?: string;
  wave?: string;
  /** "flagged" = has any quality flag, "clean" = none. */
  quality?: "flagged" | "clean";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID_RE.test(id);

function whereFor(f: ResponseFilters): SQL | undefined {
  const parts: SQL[] = [];
  if (f.q) {
    const term = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    parts.push(or(ilike(responses.name, term), ilike(responses.email, term))!);
  }
  if (f.industry) parts.push(eq(responses.industry, f.industry));
  if (f.event) parts.push(eq(responses.event, f.event));
  if (f.style) parts.push(eq(responses.style, f.style as NewResponse["style"]));
  if (f.wave) parts.push(eq(responses.wave, f.wave));
  if (f.quality === "flagged") parts.push(sql`jsonb_array_length(${responses.qualityFlags}) > 0`);
  if (f.quality === "clean") parts.push(sql`jsonb_array_length(${responses.qualityFlags}) = 0`);
  return parts.length ? and(...parts) : undefined;
}

export async function insertResponse(values: NewResponse) {
  const db = await getDb();
  const [row] = await db.insert(responses).values(values).returning({ id: responses.id });
  return row.id;
}

export async function getResponse(id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(responses).where(eq(responses.id, id)).limit(1);
  return row ?? null;
}

export async function deleteResponse(id: string) {
  if (!isUuid(id)) return;
  const db = await getDb();
  await db.delete(responses).where(eq(responses.id, id));
}

export async function updateResponsePreferences(id: string, preferences: Preferences, meta: ResponseMeta) {
  const db = await getDb();
  await db.update(responses).set({ preferences, meta }).where(eq(responses.id, id));
}

export async function listResponses(f: ResponseFilters, page: number, pageSize: number) {
  const db = await getDb();
  const where = whereFor(f);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(responses)
      .where(where)
      .orderBy(desc(responses.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(responses).where(where),
  ]);
  return { rows, total };
}

export async function allResponses(f: ResponseFilters) {
  const db = await getDb();
  return db.select().from(responses).where(whereFor(f)).orderBy(responses.createdAt);
}

/** How many responses have each style (for the responses list summary). */
export async function styleCounts(f: ResponseFilters) {
  const db = await getDb();
  return db
    .select({ style: responses.style, n: count() })
    .from(responses)
    .where(whereFor(f))
    .groupBy(responses.style)
    .orderBy(desc(count()));
}

/** Distinct values of a tag column with counts, for filter dropdowns. */
async function distinctWithCounts(column: typeof responses.event | typeof responses.wave) {
  const db = await getDb();
  const rows = await db
    .select({ value: column, n: count() })
    .from(responses)
    .where(isNotNull(column))
    .groupBy(column)
    .orderBy(asc(column));
  return rows.map((r) => ({ value: r.value!, n: r.n }));
}

export const listEvents = () => distinctWithCounts(responses.event);
export const listWaves = () => distinctWithCounts(responses.wave);

/** What the audience report needs. No names or emails. */
export const AUDIENCE_FIELDS = {
  axes: responses.axes,
  style: responses.style,
  badges: responses.badges,
  preferences: responses.preferences,
  qualityFlags: responses.qualityFlags,
  version: responses.questionnaireVersion,
};

export async function audienceRows(f: ResponseFilters) {
  const db = await getDb();
  return db.select(AUDIENCE_FIELDS).from(responses).where(whereFor(f));
}

/** Ids of every response matching the filters (for "use all matching"). */
export async function idsMatching(f: ResponseFilters) {
  const db = await getDb();
  const rows = await db.select({ id: responses.id }).from(responses).where(whereFor(f));
  return rows.map((r) => r.id);
}

export function filtersFromParams(p: Record<string, string | string[] | undefined>): ResponseFilters {
  const one = (k: string) => {
    const v = p[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s.slice(0, 200) : undefined;
  };
  const quality = one("quality");
  return {
    q: one("q"),
    industry: one("industry"),
    event: one("event"),
    style: one("style"),
    wave: one("wave"),
    quality: quality === "flagged" || quality === "clean" ? quality : undefined,
  };
}

/* ---------- Retention ---------- */

const expired = (now: Date) => and(lt(responses.createdAt, retentionCutoff(now)), isNull(responses.anonymisedAt));

/** How many responses are past the retention period and still hold personal details. */
export async function countExpiredResponses(now: Date = new Date()) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(responses).where(expired(now));
  return n;
}

/**
 * Retention job: for responses older than RETENTION_MONTHS, delete the
 * personal details (name, email, attendee reference and free text) and mark
 * them anonymised. Industry and de-identified answers are kept, so audience
 * reports and research still work. Returns the number of responses changed.
 */
export async function purgeExpiredResponses(now: Date = new Date()): Promise<number> {
  const db = await getDb();
  const rows = await db
    .update(responses)
    .set({ name: "", email: "", attendeeRef: null, freeText: null, anonymisedAt: now })
    .where(expired(now))
    .returning({ id: responses.id });
  return rows.length;
}
