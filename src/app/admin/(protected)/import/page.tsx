import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ImportTool } from "@/components/ImportTool";
import { formatDate } from "@/lib/format";
import { listImportBatches } from "@/lib/imports";
import { COLUMN_GUIDE } from "@/lib/v3/importCsv";
import { undoImport } from "../../import-actions";

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { undone } = await searchParams;
  const batches = await listImportBatches();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Import responses</h1>
          <p className="muted">
            Bring in v3 responses collected elsewhere, such as paper forms at events or a Microsoft Forms or Typeform build
            of the v3 questionnaire. Each row is checked and scored exactly as a web response would be. Responses from the
            retired v1 and v2 questionnaires can&apos;t be imported.
          </p>
        </div>
      </div>

      {undone && <p className="notice subtle">The import was undone and its responses deleted.</p>}

      <ImportTool />

      <details className="card column-guide">
        <summary>
          <strong>Column guide</strong> <span className="muted small">· one row per response, multiple choices separated by |</span>
        </summary>
        <div className="table-wrap flat">
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Required</th>
                <th>Allowed values</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              {COLUMN_GUIDE.map((c) => (
                <tr key={c.column}>
                  <td className="nowrap"><code>{c.column}</code></td>
                  <td>{c.required}</td>
                  <td>{c.allowed}</td>
                  <td><code>{c.example}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Save as CSV (UTF-8). Comma or semicolon separators both work, and labels are accepted in place of codes for the
          coded columns.
        </p>
      </details>

      <section className="card" id="batches">
        <h2 className="section-title">Previous imports</h2>
        {batches.length === 0 ? (
          <p className="muted">No imports yet.</p>
        ) : (
          <div className="table-wrap flat">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>File</th>
                  <th>Imported</th>
                  <th>Skipped</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="nowrap">{formatDate(b.createdAt)}</td>
                    <td>{b.fileName}</td>
                    <td>{b.importedCount}</td>
                    <td>
                      {b.errorCount + b.duplicateCount}
                      {b.errorCount + b.duplicateCount > 0 && (
                        <span className="muted small">
                          {" "}
                          ({b.errorCount} with errors, {b.duplicateCount} duplicates)
                        </span>
                      )}
                    </td>
                    <td className="nowrap">
                      <Link href={`/admin?batch=${b.id}`}>View</Link>{" "}
                      <form action={undoImport} className="inline-form">
                        <input type="hidden" name="id" value={b.id} />
                        <ConfirmButton
                          className="small danger"
                          message={`Undo this import? This deletes all ${b.importedCount} responses it added. This can't be undone.`}
                        >
                          Undo this import
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
