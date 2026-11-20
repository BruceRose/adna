import "server-only";
import { desc, eq, ne } from "drizzle-orm";
import { getDb, schema } from "./db";
import { IMPORT_CHUNK_SIZE, buildImportResponse, type ImportAnalysis } from "./v3/importCsv";

const { responses, importBatches } = schema;

/** "email|event" keys of existing responses, for duplicate detection. */
export async function existingDuplicateKeys(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select({ email: responses.email, event: responses.event }).from(responses).where(ne(responses.email, ""));
  return new Set(rows.map((r) => `${r.email.toLowerCase()}|${r.event ?? ""}`));
}

/**
 * Insert every valid row under one import batch, in a single transaction,
 * in chunks of 500. Rows with errors and duplicates are recorded as skipped.
 */
export async function insertImportBatch(
  a: ImportAnalysis,
  meta: { fileName: string; defaultEvent?: string; defaultConsentSource?: string },
  now: number,
): Promise<{ batchId: string; imported: number; skipped: number }> {
  const db = await getDb();
  const skipped = [
    ...a.errorRows.map((r) => ({ row: r.row, reason: r.errors })),
    ...a.duplicates.map((d) => ({ row: d.row, reason: d.reason })),
  ]
    .sort((x, y) => x.row - y.row)
    .slice(0, 5000);

  return db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(importBatches)
      .values({
        fileName: meta.fileName.slice(0, 255),
        rowsRead: a.rowsRead,
        importedCount: a.valid.length,
        errorCount: a.errorRows.length,
        duplicateCount: a.duplicates.length,
        defaultEvent: meta.defaultEvent ?? null,
        defaultConsentSource: meta.defaultConsentSource ?? null,
        skipped,
      })
      .returning({ id: importBatches.id });
    for (let i = 0; i < a.valid.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = a.valid.slice(i, i + IMPORT_CHUNK_SIZE).map((r) => buildImportResponse(r, batch.id, now));
      await tx.insert(responses).values(chunk);
    }
    return { batchId: batch.id, imported: a.valid.length, skipped: skipped.length };
  });
}

export async function listImportBatches() {
  const db = await getDb();
  return db.select().from(importBatches).orderBy(desc(importBatches.createdAt));
}

export async function getImportBatch(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1);
  return row ?? null;
}

/**
 * Undo an import: delete every response in the batch, then the batch record,
 * explicitly and in one transaction (no reliance on a database cascade).
 * Returns the number of responses deleted.
 */
export async function undoImportBatch(id: string): Promise<number> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const deleted = await tx.delete(responses).where(eq(responses.importBatchId, id)).returning({ id: responses.id });
    await tx.delete(importBatches).where(eq(importBatches.id, id));
    return deleted.length;
  });
}
