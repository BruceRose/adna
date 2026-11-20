/**
 * CSV import of v3 responses collected elsewhere (v3.1 spec section 5).
 * Pure: parsing, validation, scoring and duplicate detection. The server
 * action does the file checks and database writes.
 *
 * Every row is validated with the same zod schemas as a web submission and
 * scored with scoreV3, exactly as a web response would be.
 */
import Papa from "papaparse";
import { NORMS } from "../norms";
import type { NewResponse } from "../db/schema";
import {
  C2,
  C3,
  INDUSTRIES,
  LIKE_ME_SCALE,
  OTHER_INDUSTRY,
  P1,
  P2,
  P2_ROW_IDS,
  P3,
  P4,
  P5,
  P6,
  P7,
  P8,
  PILOT_IDS,
  QUESTIONNAIRE_VERSION,
  TRAIT_IDS,
  type Option,
  type Preferences,
} from "./items";
import { scoreV3, type V3Score } from "./scoring";
import {
  aidSchema,
  answersSchema,
  contextSchema,
  detailsSchema,
  eventSchema,
  importConsentSchema,
  isoDateNotFuture,
  pilotAnswersSchema,
  preferencesSchema,
  waveSchema,
} from "./validation";

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const IMPORT_CHUNK_SIZE = 500;

/* ---------- Columns (spec 5.1: order and names are final) ---------- */

export const IMPORT_COLUMNS: string[] = [
  "name",
  "email",
  "consent_at",
  "consent_source",
  "submitted_at",
  "industry",
  "industry_other",
  "role",
  "events_attended",
  "event",
  "wave",
  "attendee_ref",
  ...TRAIT_IDS,
  "P1",
  ...P2_ROW_IDS.map((r) => `P2_${r}`),
  "P3",
  "P4",
  "P5",
  "P6",
  "P7",
  "P8",
  "free_text",
  ...PILOT_IDS,
];

/** Columns that must be present in the header (values may still be optional). */
const OPTIONAL_COLUMNS = new Set(["submitted_at", "industry_other", "event", "wave", "attendee_ref", "free_text", "consent_source", ...PILOT_IDS]);
export const REQUIRED_COLUMNS = IMPORT_COLUMNS.filter((c) => !OPTIONAL_COLUMNS.has(c));

const ids = (options: readonly Option[]) => options.map((o) => o.id).join(", ");

/** The column guide on the import page, generated from items.ts. */
export const COLUMN_GUIDE: { column: string; required: string; allowed: string; example: string }[] = [
  { column: "name", required: "Yes", allowed: "Text, 1-200 characters", example: "Priya Example" },
  { column: "email", required: "Yes", allowed: "A valid email address", example: "priya@example.com" },
  { column: "consent_at", required: "Yes", allowed: "ISO date or date-time, not in the future", example: "2026-11-12" },
  { column: "consent_source", required: "Yes (or set a default)", allowed: "Text, 1-200 characters", example: "Paper form, Leadership Summit 2026" },
  { column: "submitted_at", required: "No", allowed: "ISO date or date-time, not in the future", example: "2026-11-12T10:15:00Z" },
  { column: "industry", required: "Yes", allowed: `One of: ${[...INDUSTRIES, OTHER_INDUSTRY].join(", ")}`, example: "Technology" },
  { column: "industry_other", required: "If industry is Other", allowed: "Text, 1-200 characters", example: "" },
  { column: "role", required: "Yes", allowed: `${ids(C2.options)} (or the option labels)`, example: "manager" },
  { column: "events_attended", required: "Yes", allowed: `${ids(C3.options)} (or None, 1-2, 3-5, 6 or more)`, example: "3_5" },
  { column: "event", required: "No", allowed: "Text (made into a slug); default from the upload form", example: "leadership-summit-2026" },
  { column: "wave", required: "No", allowed: "Text (made into a slug)", example: "" },
  { column: "attendee_ref", required: "No", allowed: "Text (letters, numbers, . _ -)", example: "" },
  { column: `${TRAIT_IDS[0]} … ${TRAIT_IDS[TRAIT_IDS.length - 1]} (22 columns)`, required: "Yes", allowed: "1-5, raw answers (do not pre-reverse), or Very unlike me … Very like me", example: "4" },
  { column: "P1", required: "Yes", allowed: `1-2 of: ${ids(P1.options)}, separated by |`, example: "learn_ideas|meet_new" },
  { column: `P2_${P2_ROW_IDS[0]} … P2_${P2_ROW_IDS[P2_ROW_IDS.length - 1]} (7 columns)`, required: "Yes", allowed: "0, 1, 2 (or Not for me, It's OK, Works well for me)", example: "2" },
  { column: "P3", required: "Yes", allowed: `1 or more of: ${ids(P3.options)}, separated by |`, example: "polls|app_anon" },
  { column: "P4", required: "Yes", allowed: `Exactly 2 of: ${ids(P4.options)}, separated by |`, example: "data|case_studies" },
  { column: "P5", required: "Yes", allowed: `${ids(P5.options)} (or the labels)`, example: "30_45" },
  { column: "P6", required: "Yes", allowed: "1-5 (or the point labels)", example: "2" },
  { column: "P7", required: "Yes", allowed: `${ids(P7.options)} (or the labels)`, example: "agenda" },
  { column: "P8", required: "Yes", allowed: `${ids(P8.options)} (or the labels)`, example: "hourly" },
  { column: "free_text", required: "No", allowed: "Up to 1,000 characters", example: "" },
  { column: `${PILOT_IDS[0]} … ${PILOT_IDS[PILOT_IDS.length - 1]} (12 columns)`, required: "No", allowed: "1-5; all 12 filled or all blank", example: "" },
];

/** The template: header row only, UTF-8 with BOM, CRLF. */
export function templateCsv(): string {
  return "﻿" + IMPORT_COLUMNS.join(",") + "\r\n";
}

/* ---------- Matching codes and labels ---------- */

/** Case-insensitive, whitespace-normalised, curly apostrophes = straight. */
export const norm = (s: string) =>
  s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

class CellError extends Error {}

function matchOption(value: string, options: readonly { id: string; label: string }[], what: string): string {
  const v = norm(value);
  const hit = options.find((o) => norm(o.id) === v || norm(o.label) === v);
  if (!hit) throw new CellError(`"${value}" isn't a recognised ${what}`);
  return hit.id;
}

const EVENTS_ALIASES = [...C3.options, { id: "1_2", label: "1-2" }, { id: "3_5", label: "3-5" }];

function matchNumber(value: string, labels: readonly { value: number; label: string }[], min: number, max: number): number {
  const v = norm(value);
  if (/^\d+$/.test(v)) {
    const n = Number(v);
    if (n < min || n > max) throw new CellError(`Must be ${min}-${max}, got ${value}`);
    return n;
  }
  const hit = labels.find((l) => norm(l.label) === v);
  if (!hit) throw new CellError(`"${value}" isn't a number ${min}-${max} or a recognised label`);
  return hit.value;
}

const splitMulti = (value: string) =>
  value
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);

/* ---------- Parsing ---------- */

export interface ImportOptions {
  defaultEvent?: string;
  defaultConsentSource?: string;
  /** "skip" (default) or "import" duplicates anyway. */
  duplicates?: "skip" | "import";
  now: number;
}

export interface RowError {
  row: number;
  column: string;
  message: string;
}

export interface ImportRow {
  row: number;
  name: string;
  email: string;
  consentAt: Date;
  consentSource: string;
  submittedAt?: Date;
  context: { industry: string; industryOther?: string; role: string; eventsAttended: string };
  answers: Record<string, number>;
  preferences: Preferences;
  pilotAnswers?: Record<string, number>;
  freeText?: string;
  event?: string;
  wave?: string;
  aid?: string;
  score: V3Score;
}

export interface ImportAnalysis {
  fileErrors: string[];
  warnings: string[];
  rowsRead: number;
  valid: ImportRow[];
  errors: RowError[];
  duplicates: { row: number; reason: string }[];
  /** Original cells of rows with errors, for the error report (header included). */
  header: string[];
  errorRows: { row: number; cells: string[]; errors: string }[];
}

const dupKey = (email: string, event: string | undefined) => `${email.toLowerCase()}|${event ?? ""}`;

/**
 * Validate a CSV file. No writes. `existingKeys` holds "email|event" keys
 * already in the database, for duplicate detection.
 */
export function analyseImport(text: string, options: ImportOptions, existingKeys: Set<string> = new Set()): ImportAnalysis {
  const out: ImportAnalysis = { fileErrors: [], warnings: [], rowsRead: 0, valid: [], errors: [], duplicates: [], header: [], errorRows: [] };
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    delimitersToGuess: [",", ";"],
    skipEmptyLines: "greedy",
  });
  const [headerRow, ...dataRows] = parsed.data;
  if (!headerRow) {
    out.fileErrors.push("The file is empty.");
    return out;
  }
  out.header = headerRow;

  // Map header cells to canonical column names (trimmed, case-insensitive).
  const canonical = new Map(IMPORT_COLUMNS.map((c) => [c.toLowerCase(), c]));
  const colIndex = new Map<string, number>();
  headerRow.forEach((h, i) => {
    const c = canonical.get(h.trim().toLowerCase());
    if (c) colIndex.set(c, i);
    else if (h.trim()) out.warnings.push(`Unknown column "${h.trim()}" was ignored.`);
  });
  const missing = REQUIRED_COLUMNS.filter((c) => !colIndex.has(c));
  if (missing.length) out.fileErrors.push(`Missing required columns: ${missing.join(", ")}`);
  if (dataRows.length > MAX_IMPORT_ROWS) out.fileErrors.push(`Too many rows: ${dataRows.length}. The limit is ${MAX_IMPORT_ROWS.toLocaleString("en-GB")}.`);
  out.rowsRead = dataRows.length;
  if (out.fileErrors.length) return out;

  const seen = new Set<string>();
  dataRows.forEach((cells, i) => {
    const rowNumber = i + 2; // as in a spreadsheet, with the header on row 1
    const get = (c: string) => (colIndex.has(c) ? (cells[colIndex.get(c)!] ?? "").trim() : "");
    const result = validateRow(get, rowNumber, options);
    if ("errors" in result) {
      out.errors.push(...result.errors);
      out.errorRows.push({ row: rowNumber, cells, errors: result.errors.map((e) => `${e.column}: ${e.message}`).join("; ") });
      return;
    }
    const key = dupKey(result.email, result.event);
    if (options.duplicates !== "import" && (existingKeys.has(key) || seen.has(key))) {
      out.duplicates.push({ row: rowNumber, reason: existingKeys.has(key) ? "Already in AudienceDNA (same email and event)" : "Repeats an earlier row in this file (same email and event)" });
      return;
    }
    seen.add(key);
    out.valid.push(result);
  });
  return out;
}

/** zod issue path → import column name. */
function columnFor(path: PropertyKey[]): string {
  const [group, key, sub] = path.map(String);
  if (group === "answers") return key;
  if (group === "pilotAnswers") return key ?? "M_E1";
  if (group === "preferences") return key === "P2" && sub ? `P2_${sub}` : (key ?? "P1");
  if (group === "context") return { industry: "industry", industryOther: "industry_other", role: "role", eventsAttended: "events_attended" }[key] ?? key;
  return key ?? group;
}

function validateRow(get: (c: string) => string, row: number, options: ImportOptions): ImportRow | { errors: RowError[] } {
  const errors: RowError[] = [];
  const cell = <T,>(column: string, fn: (v: string) => T): T | undefined => {
    try {
      return fn(get(column));
    } catch (e) {
      if (e instanceof CellError) errors.push({ row, column, message: e.message });
      else throw e;
      return undefined;
    }
  };
  const required = (column: string) => (v: string) => {
    if (!v) throw new CellError("Required");
    return v;
  };

  // Codes or labels → the shapes the zod schemas expect.
  const industryRaw = get("industry");
  const industry = industryRaw
    ? ([...INDUSTRIES, OTHER_INDUSTRY] as string[]).find((x) => norm(x) === norm(industryRaw)) ?? industryRaw
    : "";
  const role = cell("role", (v) => matchOption(required("role")(v), C2.options, "role"));
  const eventsAttended = cell("events_attended", (v) => matchOption(required("events_attended")(v), EVENTS_ALIASES, "answer"));
  const answers: Record<string, number> = {};
  for (const id of TRAIT_IDS) {
    const n = cell(id, (v) => matchNumber(required(id)(v), LIKE_ME_SCALE, 1, 5));
    if (n !== undefined) answers[id] = n;
  }
  const multi = (column: "P1" | "P3" | "P4", options: readonly Option[]) =>
    cell(column, (v) => splitMulti(required(column)(v)).map((x) => matchOption(x, options, "option")));
  const P2v: Record<string, number> = {};
  for (const r of P2_ROW_IDS) {
    const n = cell(`P2_${r}`, (v) => matchNumber(required(`P2_${r}`)(v), P2.columns, 0, 2));
    if (n !== undefined) P2v[r] = n;
  }
  const prefsInput = {
    P1: multi("P1", P1.options),
    P2: P2v,
    P3: multi("P3", P3.options),
    P4: multi("P4", P4.options),
    P5: cell("P5", (v) => matchOption(required("P5")(v), P5.options, "option")),
    P6: cell("P6", (v) => matchNumber(required("P6")(v), P6.points, 1, 5)),
    P7: cell("P7", (v) => matchOption(required("P7")(v), P7.options, "option")),
    P8: cell("P8", (v) => matchOption(required("P8")(v), P8.options, "option")),
  };
  const pilotCells = PILOT_IDS.map((id) => [id, get(id)] as const);
  const filledPilot = pilotCells.filter(([, v]) => v !== "");
  let pilotAnswers: Record<string, number> | undefined;
  if (filledPilot.length > 0 && filledPilot.length < PILOT_IDS.length) {
    errors.push({ row, column: pilotCells.find(([, v]) => v === "")![0], message: "Fill all 12 marker items or leave them all blank" });
  } else if (filledPilot.length) {
    pilotAnswers = {};
    for (const [id] of pilotCells) {
      const n = cell(id, (v) => matchNumber(v, LIKE_ME_SCALE, 1, 5));
      if (n !== undefined) pilotAnswers[id] = n;
    }
  }

  // Run the shared schemas (no duplicated rules).
  const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, prefix: string[]) => {
    if (!r.success)
      for (const i of r.error!.issues) {
        const column = columnFor([...prefix, ...i.path]);
        if (!errors.some((e) => e.column === column)) errors.push({ row, column, message: i.message });
      }
  };
  // issues() skips columns that already have an error from the cell parsing above.
  const nameEmail = detailsSchema.pick({ name: true, email: true }).safeParse({ name: get("name"), email: get("email") });
  issues(nameEmail, ["details"]);
  const context = contextSchema.safeParse({
    industry,
    industryOther: get("industry_other") || undefined,
    role: role ?? "",
    eventsAttended: eventsAttended ?? "",
  });
  issues(context, ["context"]);
  issues(answersSchema.safeParse(answers), ["answers"]);
  const prefs = preferencesSchema.safeParse(prefsInput);
  issues(prefs, ["preferences"]);
  const pilot = pilotAnswersSchema.safeParse(pilotAnswers);
  issues(pilot, ["pilotAnswers"]);
  const consent = importConsentSchema(options.now).safeParse({
    consent_at: get("consent_at"),
    consent_source: get("consent_source") || options.defaultConsentSource || "",
  });
  if (!consent.success) {
    for (const i of consent.error.issues) {
      const column = String(i.path[0]);
      if (!errors.some((e) => e.column === column))
        errors.push({ row, column, message: column === "consent_at" && !get("consent_at") ? "Required: evidence of consent" : i.message });
    }
  }
  let submittedAt: Date | undefined;
  if (get("submitted_at")) {
    const s = isoDateNotFuture(options.now).safeParse(get("submitted_at"));
    if (s.success) submittedAt = s.data;
    else errors.push({ row, column: "submitted_at", message: s.error.issues[0].message });
  }
  const freeText = get("free_text");
  if (freeText.length > 1000) errors.push({ row, column: "free_text", message: "Up to 1,000 characters" });

  if (errors.length || !nameEmail.success || !context.success || !prefs.success || !consent.success) {
    return { errors: errors.length ? errors : [{ row, column: "row", message: "Invalid row" }] };
  }

  const event = eventSchema.parse(get("event") || options.defaultEvent || undefined);
  const preferences = prefs.data as Preferences;
  return {
    row,
    name: nameEmail.data.name,
    email: nameEmail.data.email,
    consentAt: consent.data.consent_at,
    consentSource: consent.data.consent_source,
    submittedAt,
    context: context.data,
    answers,
    preferences,
    pilotAnswers,
    freeText: freeText || undefined,
    event,
    wave: waveSchema.parse(get("wave") || undefined),
    aid: aidSchema.parse(get("attendee_ref") || undefined),
    // Scored exactly as a web response; no timings, so "fast" never applies.
    score: scoreV3(answers, preferences.P1, {}),
  };
}

/** The database row for a valid imported row. */
export function buildImportResponse(r: ImportRow, batchId: string, now: number): NewResponse {
  const createdAt = r.submittedAt ?? new Date(now);
  return {
    createdAt,
    name: r.name,
    email: r.email,
    industry: r.context.industry,
    industryOther: r.context.industry === OTHER_INDUSTRY ? (r.context.industryOther ?? null) : null,
    event: r.event ?? null,
    wave: r.wave ?? null,
    attendeeRef: r.aid ?? null,
    consentAt: r.consentAt,
    consentSource: r.consentSource,
    consentVersion: "import",
    source: "import",
    importBatchId: batchId,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    normsVersion: NORMS.version,
    context: { role: r.context.role as never, eventsAttended: r.context.eventsAttended as never },
    answers: r.answers,
    preferences: r.preferences,
    scaleScores: r.score.scaleScores,
    axes: r.score.axes,
    style: r.score.style,
    styleNeighbour: r.score.styleNeighbour,
    badges: r.score.badges,
    qualityFlags: r.score.qualityFlags,
    freeText: r.freeText ?? null,
    meta: { presentedOrder: [], submittedAt: createdAt.toISOString(), userAgentClass: "unknown" },
    pilotAnswers: r.pilotAnswers ?? null,
  };
}

/** Error report: the original rows plus an "errors" column. */
export function errorReportCsv(a: Pick<ImportAnalysis, "header" | "errorRows">): string {
  const cell = (v: string) => {
    let s = v;
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [[...a.header, "errors"], ...a.errorRows.map((r) => [...r.cells, r.errors])].map((cols) => cols.map(cell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
