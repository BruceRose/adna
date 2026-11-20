"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewImport, runImport, undoImport, type ImportSummary } from "@/app/admin/import-actions";
import { ConfirmButton } from "./ConfirmButton";

const PAGE = 50;

export function ImportTool() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [done, setDone] = useState<{ batchId: string; imported: number; skipped: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pending, start] = useTransition();

  function formData() {
    const fd = new FormData(formRef.current!);
    if (file) fd.set("file", file);
    return fd;
  }

  function choose(f: File | null) {
    setFile(f);
    setSummary(null);
    setDone(null);
    setMessage(null);
    setPage(0);
  }

  const validate = () =>
    start(async () => {
      setMessage(null);
      const res = await previewImport(formData());
      if (res.ok) setSummary(res.summary);
      else setMessage(res.message);
    });

  const confirm = () =>
    start(async () => {
      const res = await runImport(formData());
      if (res.ok) {
        setDone(res);
        setSummary(null);
        router.refresh();
      } else setMessage(res.message);
    });

  function downloadErrors() {
    if (!summary?.errorReport) return;
    const url = URL.createObjectURL(new Blob([summary.errorReport], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.fileName.replace(/\.csv$/i, "")}-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card import-tool">
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="form">
        <label
          className={`dropzone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files[0] ?? null);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
          <strong>{file ? file.name : "Drop a CSV file here, or choose one"}</strong>
          <span className="muted small">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : "Up to 5 MB and 5,000 rows. Use the template below."}
          </span>
        </label>

        <div className="import-options">
          <div className="field">
            <label htmlFor="defaultEvent">Default event tag (optional)</label>
            <input id="defaultEvent" name="defaultEvent" placeholder="e.g. leadership-summit-2026" />
          </div>
          <div className="field">
            <label htmlFor="defaultConsentSource">Default consent source (optional)</label>
            <input id="defaultConsentSource" name="defaultConsentSource" placeholder="e.g. Paper form, Leadership Summit 2026" />
          </div>
          <fieldset className="field radio-field">
            <legend>Duplicates (same email and event)</legend>
            <label className="checkbox">
              <input type="radio" name="duplicates" value="skip" defaultChecked /> <span>Skip duplicates</span>
            </label>
            <label className="checkbox">
              <input type="radio" name="duplicates" value="import" /> <span>Import anyway</span>
            </label>
          </fieldset>
        </div>

        <div className="actions">
          <button type="button" className="primary" disabled={!file || pending} onClick={validate}>
            {pending && !summary ? "Checking…" : "Check file"}
          </button>
          <a className="button small" href="/admin/import/template.csv">
            Download template
          </a>
          <a className="button small" href="/admin/import/example.csv">
            Download example
          </a>
        </div>
      </form>

      {message && (
        <p className="error banner" role="alert">
          {message}
        </p>
      )}

      {summary && (
        <div className="import-summary" aria-live="polite">
          <h2 className="section-title">Check results: {summary.fileName}</h2>
          {summary.fileErrors.length > 0 && (
            <ul className="error banner file-errors" role="alert">
              {summary.fileErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <dl className="meta import-totals">
            <div><dt>Rows read</dt><dd>{summary.rowsRead}</dd></div>
            <div><dt>Valid</dt><dd>{summary.validCount}</dd></div>
            <div><dt>With errors</dt><dd>{summary.errorRowCount}</dd></div>
            <div><dt>Duplicates</dt><dd>{summary.duplicateCount}</dd></div>
            <div><dt>Warnings</dt><dd>{summary.warnings.length}</dd></div>
          </dl>
          {summary.warnings.length > 0 && (
            <ul className="notice subtle">
              {summary.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {summary.errors.length > 0 && (
            <>
              <h3 className="sub">Errors (rows with errors are never imported)</h3>
              <div className="table-wrap flat">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Column</th>
                      <th>Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.errors.slice(page * PAGE, page * PAGE + PAGE).map((e, i) => (
                      <tr key={`${e.row}-${e.column}-${i}`}>
                        <td>{e.row}</td>
                        <td>{e.column}</td>
                        <td>{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="actions">
                {summary.errors.length > PAGE && (
                  <>
                    <button type="button" className="small" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      ← Previous
                    </button>
                    <span className="muted small">
                      {page * PAGE + 1}-{Math.min(summary.errors.length, (page + 1) * PAGE)} of {summary.errors.length}
                    </span>
                    <button type="button" className="small" disabled={(page + 1) * PAGE >= summary.errors.length} onClick={() => setPage(page + 1)}>
                      Next →
                    </button>
                  </>
                )}
                <button type="button" className="small" onClick={downloadErrors}>
                  Download error report
                </button>
              </div>
            </>
          )}

          {summary.duplicates.length > 0 && (
            <p className="muted small">
              Duplicates to skip: rows {summary.duplicates.slice(0, 20).map((d) => d.row).join(", ")}
              {summary.duplicates.length > 20 ? "…" : ""}
            </p>
          )}

          {summary.preview.length > 0 && (
            <>
              <h3 className="sub">Preview of the first {summary.preview.length} valid rows</h3>
              <div className="table-wrap flat">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Event</th>
                      <th>Style</th>
                      <th>Badges</th>
                      <th>Quality flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.preview.map((r) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>{r.name}</td>
                        <td>{r.email}</td>
                        <td>{r.event || <span className="muted">-</span>}</td>
                        <td>{r.style}</td>
                        <td>{r.badges || <span className="muted">-</span>}</td>
                        <td>{r.flags || <span className="muted">None</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {summary.validCount > 0 && summary.fileErrors.length === 0 && (
            <div className="actions">
              <button type="button" className="primary" disabled={pending} onClick={confirm}>
                {pending ? "Importing…" : `Import ${summary.validCount} valid ${summary.validCount === 1 ? "row" : "rows"}`}
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="import-done" role="status">
          <h2 className="section-title">Import complete</h2>
          <p>
            Imported {done.imported} {done.imported === 1 ? "response" : "responses"}
            {done.skipped ? `, skipped ${done.skipped}` : ""}.
          </p>
          <div className="actions">
            <Link className="button primary-cta" href={`/admin?batch=${done.batchId}`}>
              View these responses
            </Link>
            <form action={undoImport} className="inline-form">
              <input type="hidden" name="id" value={done.batchId} />
              <ConfirmButton className="small danger" message={`Undo this import? This deletes the ${done.imported} responses it added.`}>
                Undo this import
              </ConfirmButton>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
