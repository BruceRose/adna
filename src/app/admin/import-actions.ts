"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { existingDuplicateKeys, insertImportBatch, undoImportBatch } from "@/lib/imports";
import { isUuid } from "@/lib/responses";
import { MAX_IMPORT_BYTES, analyseImport, errorReportCsv, type ImportAnalysis, type RowError } from "@/lib/v3/importCsv";
import { PLANNING_BADGES, STYLES, motivationLabel } from "@/lib/v3/styles";
import { eventSchema } from "@/lib/v3/validation";

const CSV_TYPES = new Set(["text/csv", "application/csv", "text/x-csv", "application/vnd.ms-excel", "text/plain", ""]);

export interface ImportSummary {
  fileName: string;
  rowsRead: number;
  validCount: number;
  errorRowCount: number;
  duplicateCount: number;
  warnings: string[];
  fileErrors: string[];
  errors: RowError[];
  duplicates: { row: number; reason: string }[];
  preview: { row: number; name: string; email: string; event: string; style: string; badges: string; flags: string }[];
  errorReport: string;
}

type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

async function readUpload(formData: FormData): Promise<Result<{ text: string; fileName: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file to upload." };
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, message: "The file is larger than 5 MB." };
  if (!CSV_TYPES.has(file.type) || !/\.csv$/i.test(file.name)) return { ok: false, message: "Upload a .csv file." };
  return { ok: true, text: await file.text(), fileName: file.name };
}

function optionsFrom(formData: FormData) {
  const defaultEvent = eventSchema.parse(String(formData.get("defaultEvent") ?? "") || undefined);
  const defaultConsentSource = String(formData.get("defaultConsentSource") ?? "").trim().slice(0, 200) || undefined;
  const duplicates = formData.get("duplicates") === "import" ? ("import" as const) : ("skip" as const);
  return { defaultEvent, defaultConsentSource, duplicates, now: Date.now() };
}

function summarise(a: ImportAnalysis, fileName: string): ImportSummary {
  return {
    fileName,
    rowsRead: a.rowsRead,
    validCount: a.valid.length,
    errorRowCount: a.errorRows.length,
    duplicateCount: a.duplicates.length,
    warnings: a.warnings,
    fileErrors: a.fileErrors,
    errors: a.errors,
    duplicates: a.duplicates,
    preview: a.valid.slice(0, 10).map((r) => ({
      row: r.row,
      name: r.name,
      email: r.email,
      event: r.event ?? "",
      style: STYLES[r.score.style].name,
      badges: [r.score.badges.planning ? PLANNING_BADGES[r.score.badges.planning].label : null, motivationLabel(r.score.badges.motivation)]
        .filter(Boolean)
        .join(" · "),
      flags: r.score.qualityFlags.join(", "),
    })),
    errorReport: a.errorRows.length ? errorReportCsv(a) : "",
  };
}

/** Validate and preview. No writes. */
export async function previewImport(formData: FormData): Promise<Result<{ summary: ImportSummary }>> {
  await requireAdmin();
  const upload = await readUpload(formData);
  if (!upload.ok) return upload;
  const analysis = analyseImport(upload.text, optionsFrom(formData), await existingDuplicateKeys());
  return { ok: true, summary: summarise(analysis, upload.fileName) };
}

/** Validate again (never trust the preview) and import the valid rows. */
export async function runImport(formData: FormData): Promise<Result<{ batchId: string; imported: number; skipped: number }>> {
  await requireAdmin();
  const upload = await readUpload(formData);
  if (!upload.ok) return upload;
  const options = optionsFrom(formData);
  const analysis = analyseImport(upload.text, options, await existingDuplicateKeys());
  if (analysis.fileErrors.length) return { ok: false, message: analysis.fileErrors.join(" ") };
  if (analysis.valid.length === 0) return { ok: false, message: "There are no valid rows to import." };
  const res = await insertImportBatch(analysis, { fileName: upload.fileName, defaultEvent: options.defaultEvent, defaultConsentSource: options.defaultConsentSource }, options.now);
  return { ok: true, ...res };
}

export async function undoImport(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (isUuid(id)) await undoImportBatch(id);
  redirect("/admin/import?undone=1");
}
