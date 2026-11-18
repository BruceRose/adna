import "server-only";
import { and, asc, count, desc, eq, ilike, isNotNull, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { NewResponse } from "./db/schema";

const { responses } = schema;

export interface ResponseFilters {
  q?: string;
  industry?: string;
  profile?: string;
  event?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function whereFor(f: ResponseFilters): SQL | undefined {
  const parts: SQL[] = [];
  if (f.q) {
    const term = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    parts.push(or(ilike(responses.name, term), ilike(responses.email, term))!);
  }
  if (f.industry) parts.push(eq(responses.industry, f.industry));
  if (f.profile) parts.push(eq(responses.profile, f.profile));
  if (f.event) parts.push(eq(responses.event, f.event));
  return parts.length ? and(...parts) : undefined;
}

export async function insertResponse(values: NewResponse) {
  const db = await getDb();
  const [row] = await db.insert(responses).values(values).returning({ id: responses.id });
  return row.id;
}

export async function getResponse(id: string) {
  if (!UUID_RE.test(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(responses).where(eq(responses.id, id)).limit(1);
  return row ?? null;
}

export async function deleteResponse(id: string) {
  if (!UUID_RE.test(id)) return;
  const db = await getDb();
  await db.delete(responses).where(eq(responses.id, id));
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

export async function profileCounts(f: ResponseFilters) {
  const db = await getDb();
  return db
    .select({ profile: responses.profile, code: responses.code, n: count() })
    .from(responses)
    .where(whereFor(f))
    .groupBy(responses.profile, responses.code)
    .orderBy(desc(count()));
}

export async function allResponses(f: ResponseFilters) {
  const db = await getDb();
  return db.select().from(responses).where(whereFor(f)).orderBy(responses.createdAt);
}

/** Distinct event tags with response counts, for filter dropdowns. */
export async function listEvents() {
  const db = await getDb();
  return db
    .select({ event: responses.event, n: count() })
    .from(responses)
    .where(isNotNull(responses.event))
    .groupBy(responses.event)
    .orderBy(asc(responses.event));
}

/** Just what the audience insights need: scores and questionnaire version. */
export async function audienceRows(f: ResponseFilters) {
  const db = await getDb();
  return db
    .select({ scores: responses.scores, version: responses.questionnaireVersion })
    .from(responses)
    .where(whereFor(f));
}

export function filtersFromParams(p: Record<string, string | string[] | undefined>): ResponseFilters {
  const one = (k: string) => {
    const v = p[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s.slice(0, 200) : undefined;
  };
  return { q: one("q"), industry: one("industry"), profile: one("profile"), event: one("event") };
}
