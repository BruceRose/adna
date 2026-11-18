import "server-only";
import ExcelJS from "exceljs";
import type { ResponseRow } from "./db/schema";
import { DIMENSIONS, POLE_INFO, QUESTIONNAIRE_VERSION, STATEMENTS, type Pole } from "./questionnaire";
import { dimensionsFromScores, maxNetFor } from "./scoring";
import { industryLabel } from "./format";

/**
 * Column layout mirrors the original FinalADNA_Analysis.xlsx:
 * identity → statements → 8 pole scores → 4 letters → 4 % leans → code → profile.
 */
const SCORE_ORDER: Pole[] = [
  "feeling",
  "thinking",
  "introvert",
  "extrovert",
  "perceiving",
  "judging",
  "intuition",
  "sensing",
];

const IDENTITY_HEADERS = ["#", "Response ID", "Submitted (UTC)", "Name", "Email", "Industry", "Event", "Version"];

export function exportHeaders(): { group: string[]; header: string[] } {
  const group = [
    ...IDENTITY_HEADERS.map(() => ""),
    ...STATEMENTS.map((s) => `Agree → ${POLE_INFO[s.agreePole].label}`),
    ...SCORE_ORDER.map(() => "Points"),
    ...DIMENSIONS.map(() => "Letter"),
    ...DIMENSIONS.map(() => "% lean"),
    "",
    "",
  ];
  const header = [
    ...IDENTITY_HEADERS,
    ...STATEMENTS.map((s) => s.text),
    ...SCORE_ORDER.map((p) => POLE_INFO[p].label),
    ...DIMENSIONS.map((d) => d.label.replace(/\s/g, "")),
    ...DIMENSIONS.map((d) => d.name),
    "Code",
    "Audience DNA Profile",
  ];
  return { group, header };
}

export function exportRow(r: ResponseRow, index: number): (string | number)[] {
  const dims = dimensionsFromScores(r.scores, maxNetFor(r.questionnaireVersion));
  return [
    index + 1,
    r.id,
    r.createdAt.toISOString().replace("T", " ").slice(0, 19),
    r.name,
    r.email,
    industryLabel(r),
    r.event ?? "",
    r.questionnaireVersion,
    // Statement columns are for the current version; older versions' answers are left blank.
    ...STATEMENTS.map((s) => (r.questionnaireVersion === QUESTIONNAIRE_VERSION ? r.answers[s.id] : "")),
    ...SCORE_ORDER.map((p) => r.scores[p]),
    ...dims.map((d) => d.letter),
    ...dims.map((d) => `${d.percent}% ${POLE_INFO[d.winner].friendly}`),
    r.code,
    r.profile,
  ];
}

/** Neutralise values a spreadsheet would treat as a formula (CSV injection). */
function csvSafe(v: string | number): string {
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: ResponseRow[]): string {
  const { header } = exportHeaders();
  const lines = [header, ...rows.map(exportRow)].map((cols) => cols.map(csvSafe).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads UTF-8 correctly
}

export async function toXlsx(rows: ResponseRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Audience DNA";
  const ws = wb.addWorksheet("Responses", { views: [{ state: "frozen", xSplit: 4, ySplit: 2 }] });
  const { group, header } = exportHeaders();

  ws.addRow(group).font = { italic: true, color: { argb: "FF666666" } };
  const h = ws.addRow(header);
  h.font = { bold: true };
  h.alignment = { wrapText: true, vertical: "top" };
  h.height = 90;
  rows.forEach((r, i) => ws.addRow(exportRow(r, i)));

  ws.columns.forEach((col, i) => {
    col.width = i < IDENTITY_HEADERS.length ? [5, 38, 20, 24, 30, 26, 18, 8][i] : 14;
  });
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: header.length } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
