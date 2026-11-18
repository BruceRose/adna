import "server-only";
import { randomBytes } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";

const { audienceReports, responses } = schema;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_REPORT_SIZE = 5000;

const newToken = () => randomBytes(18).toString("base64url");

export async function createAudienceReport(input: { name: string; note?: string; responseIds: string[] }) {
  const ids = [...new Set(input.responseIds.filter((id) => UUID_RE.test(id)))].slice(0, MAX_REPORT_SIZE);
  const db = await getDb();
  const [row] = await db
    .insert(audienceReports)
    .values({ name: input.name, note: input.note || null, responseIds: ids, shareToken: newToken() })
    .returning({ id: audienceReports.id });
  return row.id;
}

export async function listAudienceReports() {
  const db = await getDb();
  return db.select().from(audienceReports).orderBy(desc(audienceReports.createdAt));
}

export async function getAudienceReport(id: string) {
  if (!UUID_RE.test(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(audienceReports).where(eq(audienceReports.id, id)).limit(1);
  return row ?? null;
}

export async function getAudienceReportByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db.select().from(audienceReports).where(eq(audienceReports.shareToken, token)).limit(1);
  return row ?? null;
}

export async function deleteAudienceReport(id: string) {
  if (!UUID_RE.test(id)) return;
  const db = await getDb();
  await db.delete(audienceReports).where(eq(audienceReports.id, id));
}

/** Issue a new client link; the old one stops working. */
export async function resetShareToken(id: string) {
  if (!UUID_RE.test(id)) return;
  const db = await getDb();
  await db.update(audienceReports).set({ shareToken: newToken() }).where(eq(audienceReports.id, id));
}

/** Full rows for the admin view (names included). */
export async function reportMembers(ids: string[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db.select().from(responses).where(inArray(responses.id, ids)).orderBy(responses.name);
}

/** Only what the report needs: no names or emails. Used for client links. */
export async function reportScores(ids: string[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db
    .select({ scores: responses.scores, version: responses.questionnaireVersion })
    .from(responses)
    .where(inArray(responses.id, ids));
}
