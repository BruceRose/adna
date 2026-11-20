/**
 * v3 export layout (spec section 10). Pure, so it can be tested.
 */
import { createHash } from "node:crypto";
import type { ResponseRow } from "../db/schema";
import { P1, P2, P3, P4, PILOT_IDS, SCALE_IDS, TRAIT_IDS } from "./items";
import { LEVEL_NAMES, PLANNING_BADGES, STYLES } from "./styles";

export interface ExportOptions {
  /** Item-level research export: no names or emails, and a hashed response id. */
  research?: boolean;
  /** Required for research exports: used to hash response ids. */
  secret?: string;
}

/** SHA-256 of the response id plus the secret, so ids can't be reversed. */
export function researchId(id: string, secret: string): string {
  return createHash("sha256").update(id + secret).digest("hex");
}

export function v3Headers(opts: ExportOptions = {}): string[] {
  const identity = opts.research
    ? ["#", "Response ID (hashed)", "Submitted", "Industry", "Event", "Wave", "Attendee ref", "Version", "Norms version"]
    : ["#", "Response ID", "Submitted", "Name", "Email", "Industry", "Event", "Wave", "Attendee ref", "Version", "Norms version"];
  return [
    ...identity,
    "C2",
    "C3",
    ...TRAIT_IDS,
    ...SCALE_IDS,
    "Connecting score",
    "Connecting level",
    "Ideas score",
    "Ideas level",
    "Style",
    "Neighbour",
    "Planning badge",
    "Motivation",
    ...P1.options.map((o) => `P1_${o.id}`),
    ...P2.rows.map((r) => `P2_${r.id}`),
    ...P3.options.map((o) => `P3_${o.id}`),
    ...P4.options.map((o) => `P4_${o.id}`),
    "P5",
    "P6",
    "P7",
    "P8",
    "Free text",
    "Flags",
    "Part 2 seconds",
    "Presented order",
    ...PILOT_IDS,
  ];
}

const industryLabel = (r: Pick<ResponseRow, "industry" | "industryOther">) =>
  r.industryOther ? `Other: ${r.industryOther}` : r.industry;

function part2Seconds(meta: ResponseRow["meta"]): number | "" {
  if (!meta.part2StartedAt || !meta.part2EndedAt) return "";
  const ms = Date.parse(meta.part2EndedAt) - Date.parse(meta.part2StartedAt);
  return Number.isFinite(ms) ? Math.round(ms / 100) / 10 : "";
}

export function v3Row(r: ResponseRow, index: number, opts: ExportOptions = {}): (string | number)[] {
  if (opts.research && !opts.secret) throw new Error("A secret is required for research exports");
  const p = r.preferences;
  const has = (list: readonly string[], id: string) => (list.includes(id) ? 1 : 0);
  const identity = opts.research
    ? [index + 1, researchId(r.id, opts.secret!), r.createdAt.toISOString(), industryLabel(r)]
    : [index + 1, r.id, r.createdAt.toISOString(), r.name, r.email, industryLabel(r)];

  return [
    ...identity,
    r.event ?? "",
    r.wave ?? "",
    r.attendeeRef ?? "",
    r.questionnaireVersion,
    r.normsVersion,
    r.context.role,
    r.context.eventsAttended,
    ...TRAIT_IDS.map((id) => r.answers[id] ?? ""),
    ...SCALE_IDS.map((s) => r.scaleScores[s]),
    r.axes.connecting.score,
    LEVEL_NAMES.connecting[r.axes.connecting.level],
    r.axes.ideas.score,
    LEVEL_NAMES.ideas[r.axes.ideas.level],
    STYLES[r.style].name,
    r.styleNeighbour ? STYLES[r.styleNeighbour].name : "",
    r.badges.planning ? PLANNING_BADGES[r.badges.planning].label : "",
    r.badges.motivation.join(";"),
    ...P1.options.map((o) => has(p.P1, o.id)),
    ...P2.rows.map((row) => p.P2[row.id]),
    ...P3.options.map((o) => has(p.P3, o.id)),
    ...P4.options.map((o) => has(p.P4, o.id)),
    p.P5,
    p.P6,
    p.P7,
    p.P8,
    r.freeText ?? "",
    r.qualityFlags.join(";"),
    part2Seconds(r.meta),
    r.meta.presentedOrder.join(" "),
    ...PILOT_IDS.map((id) => r.pilotAnswers?.[id] ?? ""),
  ];
}

/** Neutralise values a spreadsheet would treat as a formula (CSV injection). */
export function csvCell(v: string | number): string {
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: ResponseRow[], opts: ExportOptions = {}): string {
  const lines = [v3Headers(opts), ...rows.map((r, i) => v3Row(r, i, opts))].map((cols) => cols.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads UTF-8 correctly
}
