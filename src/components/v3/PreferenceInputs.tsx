"use client";

import { useState } from "react";

import { P1, P2, P3, P4, P5, P6, P7, P8, type Option, type P2RowId, type Preferences } from "@/lib/v3/items";

export type PrefKey = keyof Preferences;
export const PREF_KEYS: PrefKey[] = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];

/** Preferences while being answered: everything optional. */
export interface DraftPreferences {
  P1: string[];
  P2: Partial<Record<P2RowId, 0 | 1 | 2>>;
  P3: string[];
  P4: string[];
  P5?: string;
  P6?: number;
  P7?: string;
  P8?: string;
}

export const EMPTY_DRAFT: DraftPreferences = { P1: [], P2: {}, P3: [], P4: [] };

export const QUESTION_TEXT: Record<PrefKey, string> = {
  P1: P1.question,
  P2: P2.question,
  P3: P3.question,
  P4: P4.question,
  P5: P5.question,
  P6: P6.question,
  P7: P7.question,
  P8: P8.question,
};

export function isAnswered(key: PrefKey, d: DraftPreferences): boolean {
  switch (key) {
    case "P1":
      return d.P1.length >= P1.min && d.P1.length <= P1.max;
    case "P2":
      return P2.rows.every((r) => d.P2[r.id] !== undefined);
    case "P3":
      return d.P3.length >= P3.min;
    case "P4":
      return d.P4.length === P4.min;
    default:
      return d[key] !== undefined;
  }
}

/** Single-choice questions advance as soon as they're answered. */
export const AUTO_ADVANCE: PrefKey[] = ["P5", "P6", "P7", "P8"];

export function PreferenceQuestion({
  qkey,
  draft,
  onChange,
  p2Order,
  onAnswered,
  headingLevel = 2,
}: {
  qkey: PrefKey;
  draft: DraftPreferences;
  onChange: (next: DraftPreferences) => void;
  p2Order: readonly P2RowId[];
  /** Called after a single-choice answer, e.g. to move on. */
  onAnswered?: () => void;
  headingLevel?: 2 | 3;
}) {
  const [swapped, setSwapped] = useState(false);
  const id = `q-${qkey}`;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const heading = (
    <Heading className={headingLevel === 2 ? "statement" : "pref-heading"} id={id} tabIndex={-1} data-step-heading>
      {QUESTION_TEXT[qkey]}
    </Heading>
  );
  const set = (patch: Partial<DraftPreferences>) => onChange({ ...draft, ...patch });

  switch (qkey) {
    case "P1":
    case "P3":
    case "P4": {
      const def = { P1, P3, P4 }[qkey];
      const chosen = draft[qkey];
      const limited = def.max < def.options.length;
      const full = limited && chosen.length >= def.max;
      const toggle = (optionId: string, on: boolean) => {
        if (!on) {
          setSwapped(false);
          set({ [qkey]: chosen.filter((x) => x !== optionId) } as Partial<DraftPreferences>);
        } else if (full) {
          // At the limit: the new choice replaces the oldest one.
          setSwapped(true);
          set({ [qkey]: [...chosen.slice(1), optionId] } as Partial<DraftPreferences>);
        } else {
          setSwapped(false);
          set({ [qkey]: [...chosen, optionId] } as Partial<DraftPreferences>);
        }
      };
      return (
        <div>
          {heading}
          <div className="choices chips-select" role="group" aria-labelledby={id}>
            {def.options.map((o) => {
              const checked = chosen.includes(o.id);
              return (
                <label key={o.id} className={`choice${checked ? " checked" : ""}${!checked && full ? " dim" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={(e) => toggle(o.id, e.target.checked)} />
                  <span>{o.label}</span>
                  <svg className="choice-tick" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </label>
              );
            })}
          </div>
          {limited && (
            <p className="choice-count muted small" aria-live="polite">
              {chosen.length} of {def.max} chosen
              {swapped && <span className="swap-note"> · Swapped for your newest choice</span>}
            </p>
          )}
        </div>
      );
    }
    case "P2":
      return (
        <div>
          {heading}
          <div className="matrix">
            {p2Order.map((rowId) => {
              const row = P2.rows.find((r) => r.id === rowId)!;
              const rowLabel = `${id}-${rowId}`;
              return (
                <div
                  key={rowId}
                  className={`matrix-row${draft.P2[rowId] !== undefined ? " answered" : ""}`}
                  role="radiogroup"
                  aria-labelledby={rowLabel}
                >
                  <span className="matrix-label" id={rowLabel}>
                    {row.label}
                  </span>
                  <div className="matrix-options">
                    {P2.columns.map((c) => (
                      <label key={c.value} className={`seg${draft.P2[rowId] === c.value ? " checked" : ""}`}>
                        <input
                          type="radio"
                          name={rowLabel}
                          checked={draft.P2[rowId] === c.value}
                          onChange={() => set({ P2: { ...draft.P2, [rowId]: c.value } })}
                        />
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    case "P6":
      return (
        <div>
          {heading}
          <div className="bipolar" role="radiogroup" aria-labelledby={id}>
            {P6.points.map((p) => (
              <label key={p.value} className={`bipolar-point${draft.P6 === p.value ? " checked" : ""}`}>
                <input
                  type="radio"
                  name={id}
                  checked={draft.P6 === p.value}
                  onChange={() => {
                    set({ P6: p.value });
                    onAnswered?.();
                  }}
                />
                <span className="bipolar-dot" aria-hidden />
                <span className="bipolar-label">{p.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    default: {
      const options: readonly Option[] = { P5: P5.options, P7: P7.options, P8: P8.options }[qkey];
      return (
        <div>
          {heading}
          <div className="choices" role="radiogroup" aria-labelledby={id}>
            {options.map((o) => (
              <label key={o.id} className={`choice radio${draft[qkey] === o.id ? " checked" : ""}`}>
                <input
                  type="radio"
                  name={id}
                  checked={draft[qkey] === o.id}
                  onChange={() => {
                    set({ [qkey]: o.id } as Partial<DraftPreferences>);
                    onAnswered?.();
                  }}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }
  }
}
