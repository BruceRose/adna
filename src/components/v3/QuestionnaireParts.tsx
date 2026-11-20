"use client";

import { TransitionLink } from "@/components/PageTransitions";
import {
  CONSENT_BULLETS,
  CONSENT_CHOICES,
  CONSENT_HEADING,
  INTRO_CONSENT_LINE,
} from "@/lib/consent";
import { PART_CARDS, type Progress } from "@/lib/v3/flow";
import { INTRO, LIKE_ME_SCALE } from "@/lib/v3/items";
import { CONNECTING_ROWS, GRID, IDEAS_COLUMNS, STYLES, type StyleId } from "@/lib/v3/styles";
import { StyleEmblem } from "./StyleEmblem";
import { MiniGrid } from "./StyleGrid";

/* ---------- Intro ---------- */

export function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="card intro">
      <h1 id="step-heading" tabIndex={-1} data-step-heading>
        {INTRO.title}
      </h1>
      <p className="lede">{INTRO.body}</p>
      <ul className="preview-cards" aria-label="What you'll get">
        <li>
          <StyleEmblem style="connector" size={44} />
          <span>Your event style</span>
        </li>
        <li>
          <MiniGrid style="explorer" size={44} />
          <span>Your style map</span>
        </li>
        <li>
          <TipsIcon />
          <span>Tips for your events</span>
        </li>
      </ul>
      <p className="intro-meta">Easy questions · 3 short parts</p>
      <p className="muted intro-consent">{INTRO_CONSENT_LINE}</p>
      <button type="button" className="primary" onClick={onStart}>
        Let&apos;s go →
      </button>
      <p className="intro-styles-link">
        <TransitionLink href="/styles">Curious first? Meet the nine styles</TransitionLink>
      </p>
    </section>
  );
}

function TipsIcon() {
  return (
    <svg className="tips-icon" viewBox="0 0 48 48" width={44} height={44} aria-hidden="true">
      <path d="M24 8a12 12 0 0 0-7 21.8V34h14v-4.2A12 12 0 0 0 24 8Z" />
      <path d="M19 39h10M21 43h6" />
    </svg>
  );
}

/* ---------- Part cards (interstitials) ---------- */

export function PartMap({ current }: { current: 1 | 2 | 3 | null }) {
  return (
    <ol className="part-map" aria-label="Three parts">
      {([1, 2, 3] as const).map((p) => (
        <li key={p} className={p === current ? "current" : current && p < current ? "done" : ""} aria-current={p === current ? "step" : undefined}>
          <span className="part-dot">{p}</span>
          <span className="part-name">{["About you", "How you are at events", "Your preferences"][p - 1]}</span>
        </li>
      ))}
    </ol>
  );
}

export function PartCard({ part, onContinue, onBack }: { part: 1 | 2 | 3; onContinue: () => void; onBack: () => void }) {
  const copy = PART_CARDS[part];
  return (
    <div className="part-card">
      <PartMap current={part} />
      <h2 className="statement" id="step-heading" tabIndex={-1} data-step-heading>
        {copy.title}
      </h2>
      <p className="lede">{copy.body}</p>
      <div className="nav">
        <button type="button" className="ghost" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="primary" onClick={onContinue}>
          Continue →
        </button>
      </div>
      <p className="hint">Press Enter to continue.</p>
    </div>
  );
}

/* ---------- Progress ---------- */

export function ProgressHeader({ progress, stepKey }: { progress: Progress; stepKey: number }) {
  return (
    <div className="qprogress">
      <div className="qprogress-text">
        <span>{progress.label}</span>
        {progress.timeLeft && <span className="muted">{progress.timeLeft}</span>}
      </div>
      <div className="qprogress-bar" aria-hidden>
        {progress.segments.map((fill, i) => (
          <span key={i} className={`seg-track${progress.current === i + 1 ? " current" : ""}`}>
            <span className="seg-fill" style={{ transform: `scaleX(${fill})` }} />
            {progress.current === i + 1 && <span key={stepKey} className="seg-shimmer" />}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Consent ---------- */

export function ConsentNotice({ hasAid }: { hasAid: boolean }) {
  return (
    <section className="consent-notice" aria-labelledby="consent-heading">
      <h3 id="consent-heading">{CONSENT_HEADING}</h3>
      <ul>
        {CONSENT_BULLETS.filter((b) => !b.aidOnly || hasAid).map((b) => (
          <li key={b.key}>
            <strong>{b.title}</strong> {b.text}
          </li>
        ))}
        <li>
          <strong>{CONSENT_CHOICES.title}</strong> {CONSENT_CHOICES.before}
          <a href={`mailto:${CONSENT_CHOICES.email}`}>{CONSENT_CHOICES.email}</a>
          {CONSENT_CHOICES.after}
          <a href={CONSENT_CHOICES.linkUrl} target="_blank" rel="noopener noreferrer">
            {CONSENT_CHOICES.linkText}
          </a>
          .
        </li>
      </ul>
    </section>
  );
}

/* ---------- Part 2 statements ---------- */

export function LikeMeQuestion({
  text,
  instruction,
  showInstruction,
  value,
  onAnswer,
  onBack,
  onNext,
}: {
  text: string;
  instruction: string;
  showInstruction: boolean;
  value: number | undefined;
  onAnswer: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      {showInstruction ? <p className="instruction">{instruction}</p> : <p className="instruction-small">{instruction}</p>}
      <h2 className="statement" id="step-heading" tabIndex={-1} data-step-heading>
        {text}
      </h2>
      <div className="likeme" role="radiogroup" aria-labelledby="step-heading">
        {LIKE_ME_SCALE.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={value === s.value}
            className={`likeme-option${value === s.value ? " selected" : ""}`}
            onClick={() => onAnswer(s.value)}
          >
            <span className="likeme-num" aria-hidden>
              <span className="n">{s.value}</span>
              <svg className="likeme-tick" viewBox="0 0 16 16">
                <path d="M3.5 8.5l3 3 6-7" />
              </svg>
            </span>
            <span className="likeme-label">{s.label}</span>
          </button>
        ))}
      </div>
      <div className="nav">
        <button type="button" className="ghost" onClick={onBack}>
          ← Back
        </button>
        {value !== undefined && (
          <button type="button" className="ghost" onClick={onNext}>
            Next →
          </button>
        )}
      </div>
      <p className="hint">Tip: you can press 1-5 on your keyboard to answer.</p>
    </>
  );
}

/* ---------- Form helpers ---------- */

export function Field(props: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={props.htmlFor}>{props.label}</label>
      {props.children}
      {props.error && <p className="error">{props.error}</p>}
    </div>
  );
}

export function RadioField({
  name,
  legend,
  options,
  value,
  error,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly { id: string; label: string }[];
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="field radio-field" aria-invalid={!!error}>
      <legend>{legend}</legend>
      <div className="choices compact">
        {options.map((o) => (
          <label key={o.id} className={`choice radio${value === o.id ? " checked" : ""}`}>
            <input type="radio" name={name} checked={value === o.id} onChange={() => onChange(o.id)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
    </fieldset>
  );
}

/* ---------- Resume and reveal ---------- */

export function ResumePrompt({ onContinue, onRestart }: { onContinue: () => void; onRestart: () => void }) {
  return (
    <section className="card resume" role="dialog" aria-labelledby="resume-heading">
      <h2 id="resume-heading" className="statement" tabIndex={-1} data-step-heading>
        Pick up where you left off?
      </h2>
      <p className="muted">Your answers so far are saved in this browser tab.</p>
      <div className="nav">
        <button type="button" className="ghost" onClick={onRestart}>
          Start again
        </button>
        <button type="button" className="primary" onClick={onContinue}>
          Continue →
        </button>
      </div>
    </section>
  );
}

/** "Working out your style…": the grid lights up in sequence, then the respondent's cell glows. */
export function RevealScreen({ style, reducedMotion }: { style: StyleId | null; reducedMotion: boolean }) {
  return (
    <section className="card reveal" aria-live="polite" aria-busy={!style}>
      <h2 className="statement" id="step-heading" tabIndex={-1}>
        Working out your style…
      </h2>
      {reducedMotion ? (
        <div className="spinner" aria-hidden />
      ) : (
        <div className="reveal-grid" aria-hidden>
          {CONNECTING_ROWS.flatMap((c) => IDEAS_COLUMNS.map((i) => GRID[c][i])).map((id, k) => (
            <span
              key={id}
              className={`reveal-cell${style === id ? " glow" : ""}${style && style !== id ? " fade" : ""}`}
              style={{ animationDelay: `${k * 90}ms`, ["--c" as string]: `var(--style-${id})` }}
            >
              <StyleEmblem style={id} size={36} />
            </span>
          ))}
        </div>
      )}
      {style && <p className="sr-only">Your style is {STYLES[style].name}.</p>}
    </section>
  );
}
