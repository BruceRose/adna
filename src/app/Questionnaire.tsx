"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DETAILS_POSITION } from "@/lib/config";
import {
  C1_QUESTION,
  C2,
  C3,
  FREE_TEXT,
  INDUSTRIES,
  INTRO,
  LIKE_ME_SCALE,
  OTHER_INDUSTRY,
  PART2_INSTRUCTION,
  PILOT_INSTRUCTION,
  PILOT_ITEMS,
  SECTION_LABELS,
  TRAIT_ITEMS,
  p2RowOrder,
  presentationOrder,
  type Preferences,
} from "@/lib/v3/items";
import type { FieldErrors } from "@/lib/v3/validation";
import {
  CONSENT_BULLETS,
  CONSENT_BUTTON,
  CONSENT_CHECKBOX_LABEL,
  CONSENT_CHOICES,
  CONSENT_ERROR,
  CONSENT_HEADING,
  INTRO_CONSENT_LINE,
} from "@/lib/consent";
import {
  AUTO_ADVANCE,
  EMPTY_DRAFT,
  PREF_KEYS,
  PreferenceQuestion,
  isAnswered,
  type DraftPreferences,
  type PrefKey,
} from "@/components/v3/PreferenceInputs";
import { submitResponse } from "./actions";

type Step =
  | { kind: "intro" }
  | { kind: "details" }
  | { kind: "part1" }
  | { kind: "trait"; id: string; index: number }
  | { kind: "pilot"; id: string; index: number }
  | { kind: "pref"; key: PrefKey }
  | { kind: "freeText" };

interface Props {
  seed: number;
  event?: string;
  wave?: string;
  aid?: string;
  pilot: boolean;
}

const ADVANCE_DELAY_MS = 220;
const now = () => new Date().toISOString();

export function Questionnaire({ seed, event, wave, aid, pilot }: Props) {
  const router = useRouter();
  const order = useMemo(() => presentationOrder(seed), [seed]);
  const p2Order = useMemo(() => p2RowOrder(seed), [seed]);

  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [{ kind: "intro" }];
    if (DETAILS_POSITION === "start") s.push({ kind: "details" });
    s.push({ kind: "part1" });
    order.forEach((id, index) => s.push({ kind: "trait", id, index }));
    if (pilot) PILOT_ITEMS.forEach((item, index) => s.push({ kind: "pilot", id: item.id, index }));
    PREF_KEYS.forEach((key) => s.push({ kind: "pref", key }));
    s.push({ kind: "freeText" });
    if (DETAILS_POSITION === "end") s.push({ kind: "details" });
    return s;
  }, [order, pilot]);

  // Steps that count towards the progress bar (Parts 1-3).
  const progressSteps = useMemo(
    () => steps.map((s, i) => ({ s, i })).filter(({ s }) => ["part1", "trait", "pilot", "pref"].includes(s.kind)),
    [steps],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [details, setDetails] = useState({ name: "", email: "", consent: false });
  const [context, setContext] = useState({ industry: "", industryOther: "", role: "", eventsAttended: "" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pilotAnswers, setPilotAnswers] = useState<Record<string, number>>({});
  const [prefs, setPrefs] = useState<DraftPreferences>(EMPTY_DRAFT);
  const [freeText, setFreeText] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timings = useRef<{ startedAt?: string; part2StartedAt?: string; part2EndedAt?: string }>({});
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // Timings: first question shown, and the start of Part 2.
  useEffect(() => {
    if (step.kind === "part1") timings.current.startedAt ??= now();
    if (step.kind === "trait") timings.current.part2StartedAt ??= now();
  }, [step]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const goTo = useCallback((i: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setStepIndex(Math.max(0, Math.min(i, steps.length - 1)));
    setFormError(null);
    window.scrollTo({ top: 0 });
  }, [steps.length]);

  const next = useCallback(() => goTo(stepIndex + 1), [goTo, stepIndex]);
  const back = useCallback(() => goTo(stepIndex - 1), [goTo, stepIndex]);
  const advanceSoon = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => setStepIndex((i) => Math.min(i + 1, steps.length - 1)), ADVANCE_DELAY_MS);
  }, [steps.length]);

  const answerLikeMe = useCallback(
    (value: number) => {
      if (step.kind === "trait") {
        setAnswers((a) => ({ ...a, [step.id]: value }));
        if (step.index === order.length - 1) timings.current.part2EndedAt = now();
      } else if (step.kind === "pilot") {
        setPilotAnswers((a) => ({ ...a, [step.id]: value }));
      } else return;
      if (!isLast) advanceSoon();
    },
    [step, order.length, isLast, advanceSoon],
  );

  // Keyboard: 1-5 answers Part 2 statements, left arrow goes back.
  useEffect(() => {
    if (step.kind !== "trait" && step.kind !== "pilot") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) answerLikeMe(n);
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, answerLikeMe, back]);

  /* ---------- Validation for the form screens ---------- */

  function validateDetails(): FieldErrors {
    const e: FieldErrors = {};
    if (!details.name.trim()) e.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) e.email = "Please enter a valid email address";
    if (!details.consent) e.consent = CONSENT_ERROR;
    return e;
  }

  function validateContext(): FieldErrors {
    const e: FieldErrors = {};
    if (!context.industry) e.industry = "Please choose your industry";
    if (context.industry === OTHER_INDUSTRY && !context.industryOther.trim()) e.industryOther = "Please tell us your industry";
    if (!context.role) e.role = "Please choose your role";
    if (!context.eventsAttended) e.eventsAttended = "Please choose an answer";
    return e;
  }

  function continueFrom(validate: () => FieldErrors) {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (isLast) submit();
    else next();
  }

  /* ---------- Submit ---------- */

  function submit() {
    setFormError(null);
    const presentedOrder = [...order, ...p2Order.map((r) => `P2.${r}`)];
    startTransition(async () => {
      const res = await submitResponse({
        details: { name: details.name, email: details.email, consent: details.consent as true },
        context: {
          industry: context.industry as never,
          industryOther: context.industryOther || undefined,
          role: context.role as never,
          eventsAttended: context.eventsAttended as never,
        },
        answers,
        pilotAnswers: pilot ? pilotAnswers : undefined,
        preferences: prefs as unknown as Preferences,
        freeText: freeText || undefined,
        meta: { presentedOrder, ...timings.current },
        event,
        wave,
        aid,
      });
      if (res.ok) {
        router.push(`/results/${res.id}`);
        return;
      }
      setFormError(res.message);
      if (res.fieldErrors && Object.keys(res.fieldErrors).length) {
        setErrors(res.fieldErrors);
        const detailsKeys = ["name", "email", "consent"];
        const target = Object.keys(res.fieldErrors).some((k) => detailsKeys.includes(k)) ? "details" : "part1";
        goTo(steps.findIndex((s) => s.kind === target));
      }
    });
  }

  /* ---------- Rendering ---------- */

  const progressPos = progressSteps.findIndex(({ i }) => i === stepIndex);
  const progress =
    progressPos >= 0
      ? progressPos / progressSteps.length
      : stepIndex > (progressSteps.at(-1)?.i ?? 0)
        ? 1
        : 0;

  const sectionLabel =
    step.kind === "part1"
      ? SECTION_LABELS.part1
      : step.kind === "trait" || step.kind === "pilot"
        ? SECTION_LABELS.part2
        : step.kind === "pref"
          ? SECTION_LABELS.part3
          : null;

  const submitLabel = pending ? "Working out your event style…" : "See my event style";

  if (step.kind === "intro") {
    return (
      <section className="card intro">
        <h1>{INTRO.title}</h1>
        <p className="lede">{INTRO.body}</p>
        <p className="muted intro-consent">{INTRO_CONSENT_LINE}</p>
        <button type="button" className="primary" onClick={next}>
          Let&apos;s go →
        </button>
        <p className="intro-styles-link">
          <Link href="/styles">Curious first? Meet the nine styles</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="card question">
      {progressPos >= 0 || step.kind === "freeText" ? (
        <div className="progress" aria-hidden>
          <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      ) : null}
      {sectionLabel && <p className="eyebrow">{sectionLabel}</p>}

      <div key={stepIndex} className="slide-in">
        {step.kind === "details" && (
          <form
            className="form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              continueFrom(validateDetails);
            }}
          >
            <h2 className="statement">About you</h2>
            <Field label="Your name" error={errors.name} htmlFor="name">
              <input id="name" autoComplete="name" value={details.name} aria-invalid={!!errors.name}
                onChange={(e) => setDetails({ ...details, name: e.target.value })} />
            </Field>
            <Field label="Your email" error={errors.email} htmlFor="email">
              <input id="email" type="email" autoComplete="email" value={details.email} aria-invalid={!!errors.email}
                onChange={(e) => setDetails({ ...details, email: e.target.value })} />
            </Field>
            <ConsentNotice hasAid={Boolean(aid)} />
            <div className="field">
              <label className="checkbox">
                <input type="checkbox" checked={details.consent} aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "consent-error" : undefined}
                  onChange={(e) => {
                    setDetails({ ...details, consent: e.target.checked });
                    if (e.target.checked) setErrors((x) => ({ ...x, consent: undefined }));
                  }} />
                <span>{CONSENT_CHECKBOX_LABEL}</span>
              </label>
              {errors.consent && <p className="error" id="consent-error" role="alert">{errors.consent}</p>}
            </div>
            {formError && <p className="error banner">{formError}</p>}
            <div className="nav">
              <button type="button" className="ghost" onClick={back}>← Back</button>
              {/* aria-disabled rather than disabled, so a click still shows the error for screen-reader users. */}
              <button type="submit" className="primary" aria-disabled={!details.consent || pending}>
                {isLast ? submitLabel : CONSENT_BUTTON}
              </button>
            </div>
          </form>
        )}

        {step.kind === "part1" && (
          <form
            className="form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              continueFrom(validateContext);
            }}
          >
            <Field label={C1_QUESTION} error={errors.industry} htmlFor="industry">
              <select id="industry" value={context.industry} aria-invalid={!!errors.industry}
                onChange={(e) => setContext({ ...context, industry: e.target.value })}>
                <option value="" disabled>Choose your industry…</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                <option>{OTHER_INDUSTRY}</option>
              </select>
            </Field>
            {context.industry === OTHER_INDUSTRY && (
              <Field label="Your industry" error={errors.industryOther} htmlFor="industryOther">
                <input id="industryOther" value={context.industryOther} aria-invalid={!!errors.industryOther}
                  onChange={(e) => setContext({ ...context, industryOther: e.target.value })} />
              </Field>
            )}
            <RadioField name="role" legend={C2.question} options={C2.options} value={context.role} error={errors.role}
              onChange={(role) => setContext({ ...context, role })} />
            <RadioField name="eventsAttended" legend={C3.question} options={C3.options} value={context.eventsAttended}
              error={errors.eventsAttended} onChange={(eventsAttended) => setContext({ ...context, eventsAttended })} />
            {formError && <p className="error banner">{formError}</p>}
            <div className="nav">
              <button type="button" className="ghost" onClick={back}>← Back</button>
              <button type="submit" className="primary">Continue →</button>
            </div>
          </form>
        )}

        {(step.kind === "trait" || step.kind === "pilot") && (
          <LikeMeQuestion
            step={step}
            value={step.kind === "trait" ? answers[step.id] : pilotAnswers[step.id]}
            onAnswer={answerLikeMe}
            onBack={back}
            onNext={next}
          />
        )}

        {step.kind === "pref" && (
          <>
            <PreferenceQuestion
              qkey={step.key}
              draft={prefs}
              onChange={setPrefs}
              p2Order={p2Order}
              onAnswered={AUTO_ADVANCE.includes(step.key) ? advanceSoon : undefined}
            />
            <div className="nav">
              <button type="button" className="ghost" onClick={back}>← Back</button>
              <button type="button" className="primary" disabled={!isAnswered(step.key, prefs)} onClick={next}>
                Next →
              </button>
            </div>
          </>
        )}

        {step.kind === "freeText" && (
          <div className="form">
            <label htmlFor="freeText" className="statement">{FREE_TEXT.question}</label>
            <p className="muted small" id="freeText-help">{FREE_TEXT.helper}</p>
            <textarea id="freeText" rows={5} maxLength={FREE_TEXT.maxLength} value={freeText} aria-describedby="freeText-help"
              onChange={(e) => setFreeText(e.target.value)} placeholder="Optional" />
            <p className="muted small right">{freeText.length} / {FREE_TEXT.maxLength}</p>
            {formError && <p className="error banner">{formError}</p>}
            <div className="nav">
              <button type="button" className="ghost" onClick={back}>← Back</button>
              <button type="button" className="primary" disabled={pending} onClick={() => (isLast ? submit() : next())}>
                {isLast ? submitLabel : freeText.trim() ? "Continue →" : "Skip →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ConsentNotice({ hasAid }: { hasAid: boolean }) {
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

function LikeMeQuestion({
  step,
  value,
  onAnswer,
  onBack,
  onNext,
}: {
  step: { kind: "trait" | "pilot"; id: string; index: number };
  value: number | undefined;
  onAnswer: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isPilot = step.kind === "pilot";
  const text = isPilot ? PILOT_ITEMS.find((i) => i.id === step.id)!.text : TRAIT_ITEMS.find((i) => i.id === step.id)!.text;
  const instruction = isPilot ? PILOT_INSTRUCTION : PART2_INSTRUCTION;
  const first = step.index === 0;

  return (
    <>
      {first ? <p className="instruction">{instruction}</p> : <p className="instruction-small">{instruction}</p>}
      <h2 className="statement" id="statement">{text}</h2>
      <div className="likeme" role="radiogroup" aria-labelledby="statement">
        {LIKE_ME_SCALE.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={value === s.value}
            className={`likeme-option${value === s.value ? " selected" : ""}`}
            onClick={() => onAnswer(s.value)}
          >
            <span className="likeme-num" aria-hidden>{s.value}</span>
            <span className="likeme-label">{s.label}</span>
          </button>
        ))}
      </div>
      <div className="nav">
        <button type="button" className="ghost" onClick={onBack}>← Back</button>
        {value !== undefined && (
          <button type="button" className="ghost" onClick={onNext}>Next →</button>
        )}
      </div>
      <p className="hint">Tip: you can press 1-5 on your keyboard to answer.</p>
    </>
  );
}

function Field(props: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={props.htmlFor}>{props.label}</label>
      {props.children}
      {props.error && <p className="error">{props.error}</p>}
    </div>
  );
}

function RadioField({
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
