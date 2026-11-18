"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRIES, OTHER_INDUSTRY, SCALE_ENDS, SCALE_VALUES, STATEMENTS } from "@/lib/questionnaire";
import type { FieldErrors } from "@/lib/validation";
import { submitResponse } from "./actions";

type Step = "details" | number;

interface DetailsState {
  name: string;
  email: string;
  industry: string;
  industryOther: string;
  consent: boolean;
}

const EMPTY: DetailsState = { name: "", email: "", industry: "", industryOther: "", consent: false };
const ADVANCE_DELAY_MS = 220;

export function Questionnaire({ event }: { event?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState<DetailsState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = STATEMENTS.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  const update = <K extends keyof DetailsState>(key: K, value: DetailsState[K]) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validateDetails(): FieldErrors {
    const e: FieldErrors = {};
    if (!details.name.trim()) e.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) e.email = "Please enter a valid email address";
    if (!details.industry) e.industry = "Please choose your industry";
    if (details.industry === OTHER_INDUSTRY && !details.industryOther.trim())
      e.industryOther = "Please tell us your industry";
    if (!details.consent) e.consent = "Please confirm you're happy for us to store your answers";
    return e;
  }

  function startQuestions(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validateDetails();
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(0);
  }

  const choose = useCallback(
    (index: number, value: number) => {
      const id = STATEMENTS[index].id;
      setAnswers((a) => ({ ...a, [id]: value }));
      setFormError(null);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (index < total - 1) {
        advanceTimer.current = setTimeout(() => setStep(index + 1), ADVANCE_DELAY_MS);
      }
    },
    [total],
  );

  const goBack = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setStep((s) => (s === "details" || s === 0 ? "details" : s - 1));
  }, []);

  // Keyboard shortcuts on question screens: 1–6 to answer, ← to go back, → to go forward if answered.
  useEffect(() => {
    if (typeof step !== "number") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 6) choose(step, n);
      else if (e.key === "ArrowLeft") goBack();
      else if (e.key === "ArrowRight" && answers[STATEMENTS[step].id] && step < total - 1) setStep(step + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, answers, choose, goBack, total]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  function submit() {
    setFormError(null);
    startTransition(async () => {
      const res = await submitResponse({
        details: {
          name: details.name,
          email: details.email,
          industry: details.industry as never,
          industryOther: details.industryOther || undefined,
          consent: details.consent as true,
        },
        answers,
        event,
      });
      if (res.ok) {
        router.push(`/results/${res.id}`);
      } else {
        setFormError(res.message);
        if (res.fieldErrors && Object.keys(res.fieldErrors).length) {
          setErrors(res.fieldErrors);
          setStep("details");
        }
      }
    });
  }

  if (step === "details") {
    return (
      <section className="card">
        <h1>Discover your Audience DNA</h1>
        <p className="lede">
          {total} quick statements, about {Math.max(2, Math.round(total / 5))} minutes. There are no right or wrong
          answers, so just go with your gut. At the end you&apos;ll discover your profile and how you like to connect.
        </p>
        <form onSubmit={startQuestions} noValidate className="form">
          <Field label="Your name" error={errors.name} htmlFor="name">
            <input
              id="name"
              autoComplete="name"
              value={details.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={!!errors.name}
            />
          </Field>
          <Field label="Your email" error={errors.email} htmlFor="email">
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={details.email}
              onChange={(e) => update("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field label="Your industry" error={errors.industry} htmlFor="industry">
            <select
              id="industry"
              value={details.industry}
              onChange={(e) => update("industry", e.target.value)}
              aria-invalid={!!errors.industry}
            >
              <option value="" disabled>
                Choose your industry…
              </option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
              <option>{OTHER_INDUSTRY}</option>
            </select>
          </Field>
          {details.industry === OTHER_INDUSTRY && (
            <Field label="Your industry" error={errors.industryOther} htmlFor="industryOther">
              <input
                id="industryOther"
                value={details.industryOther}
                onChange={(e) => update("industryOther", e.target.value)}
                aria-invalid={!!errors.industryOther}
                autoFocus
              />
            </Field>
          )}
          <div className="field">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={details.consent}
                onChange={(e) => update("consent", e.target.checked)}
                aria-invalid={!!errors.consent}
              />
              <span>I&apos;m happy for my details and answers to be stored so my Audience DNA profile can be created.</span>
            </label>
            {errors.consent && <p className="error">{errors.consent}</p>}
          </div>
          {formError && <p className="error banner">{formError}</p>}
          <button type="submit" className="primary">
            {answeredCount > 0 ? "Carry on →" : "Let's go →"}
          </button>
        </form>
      </section>
    );
  }

  const statement = STATEMENTS[step];
  const current = answers[statement.id];
  const isLast = step === total - 1;

  return (
    <section className="card question">
      <div className="progress" aria-hidden>
        <div className="progress-fill" style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>
      <div key={step} className="slide-in">
        <p className="eyebrow">
          Statement {step + 1} of {total}
          {cheer(step, total) && <span className="cheer">{cheer(step, total)}</span>}
        </p>
        <h2 className="statement" id="statement">
          {statement.text}
        </h2>
        <div className="scale-wrap">
          <span className="scale-end disagree" aria-hidden>
            {SCALE_ENDS.min}
          </span>
          <div className="scale" role="radiogroup" aria-labelledby="statement">
            {SCALE_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={current === v}
                aria-label={
                  v === 1 ? `1 of 6, ${SCALE_ENDS.min}` : v === 6 ? `6 of 6, ${SCALE_ENDS.max}` : `${v} of 6`
                }
                className={`dot dot-${v}${current === v ? " selected" : ""}`}
                onClick={() => choose(step, v)}
              />
            ))}
          </div>
          <span className="scale-end agree" aria-hidden>
            {SCALE_ENDS.max}
          </span>
        </div>
      </div>
      <div className="nav">
        <button type="button" className="ghost" onClick={goBack}>
          ← Back
        </button>
        {isLast ? (
          <button type="button" className="primary" disabled={!allAnswered || pending} onClick={submit}>
            {pending ? "Working out your profile…" : "Reveal my profile →"}
          </button>
        ) : (
          current && (
            <button type="button" className="ghost" onClick={() => setStep(step + 1)}>
              Next →
            </button>
          )
        )}
      </div>
      {isLast && !allAnswered && current && (
        <p className="error">
          You&apos;ve skipped {total - answeredCount} statement{total - answeredCount === 1 ? "" : "s"}. Go back to
          answer {total - answeredCount === 1 ? "it" : "them"}.
        </p>
      )}
      {formError && <p className="error banner">{formError}</p>}
      <p className="hint">Tip: you can press 1–6 on your keyboard to answer.</p>
    </section>
  );
}

/** A little encouragement at a few points along the way. */
function cheer(step: number, total: number): string | null {
  if (step === 0) return "Go with your first instinct";
  if (step === Math.floor(total / 2)) return "Halfway there!";
  if (step === total - 1) return "Last one!";
  return null;
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
