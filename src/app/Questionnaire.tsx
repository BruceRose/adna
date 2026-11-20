"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { DETAILS_POSITION } from "@/lib/config";
import { CONSENT_BUTTON, CONSENT_CHECKBOX_LABEL, CONSENT_ERROR } from "@/lib/consent";
import {
  DRAFT_KEY,
  buildSteps,
  milestoneFor,
  parseDraft,
  progressFor,
  type Draft,
} from "@/lib/v3/flow";
import {
  C1_QUESTION,
  C2,
  C3,
  FREE_TEXT,
  INDUSTRIES,
  OTHER_INDUSTRY,
  PART2_INSTRUCTION,
  PILOT_INSTRUCTION,
  PILOT_ITEMS,
  TRAIT_ITEMS,
  p2RowOrder,
  presentationOrder,
  type Preferences,
} from "@/lib/v3/items";
import type { StyleId } from "@/lib/v3/styles";
import type { FieldErrors } from "@/lib/v3/validation";
import { AUTO_ADVANCE, EMPTY_DRAFT, PreferenceQuestion, isAnswered, type DraftPreferences } from "@/components/v3/PreferenceInputs";
import {
  ConsentNotice,
  Field,
  IntroScreen,
  LikeMeQuestion,
  PartCard,
  ProgressHeader,
  RadioField,
  ResumePrompt,
  RevealScreen,
} from "@/components/v3/QuestionnaireParts";
import { submitResponse } from "./actions";

interface Props {
  seed: number;
  event?: string;
  wave?: string;
  aid?: string;
  pilot: boolean;
}

/** Long enough to see your choice register before moving on. */
const ADVANCE_DELAY_MS = 380;
/** Reveal timing: at least 1.2s, at most 2.5s unless the server is slower. */
const REVEAL_MIN_MS = 1200;
const REVEAL_MAX_MS = 2500;
const REVEAL_GLOW_MS = 400;

const now = () => new Date().toISOString();
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const storage = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* storage unavailable: carry on without saving */
    }
  },
  remove: (k: string) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export function Questionnaire({ seed: initialSeed, event, wave, aid, pilot }: Props) {
  const router = useRouter();
  const [seed, setSeed] = useState(initialSeed);
  const order = useMemo(() => presentationOrder(seed), [seed]);
  const p2Order = useMemo(() => p2RowOrder(seed), [seed]);
  const steps = useMemo(() => buildSteps(order, pilot, DETAILS_POSITION), [order, pilot]);

  const [stepIndex, setStepIndex] = useState(0);
  const [anim, setAnim] = useState<"forward" | "back" | "vt">("forward");
  const [details, setDetails] = useState({ name: "", email: "", consent: false });
  const [detailsDone, setDetailsDone] = useState(false);
  const [context, setContext] = useState({ industry: "", industryOther: "", role: "", eventsAttended: "" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pilotAnswers, setPilotAnswers] = useState<Record<string, number>>({});
  const [prefs, setPrefs] = useState<DraftPreferences>(EMPTY_DRAFT);
  const [freeText, setFreeText] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAfterDetails, setSubmitAfterDetails] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<Draft | null>(null);
  const [reveal, setReveal] = useState<{ style: StyleId | null; reducedMotion: boolean } | null>(null);
  const timings = useRef<Draft["timings"]>({});
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);
  indexRef.current = stepIndex;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const detailsIndex = steps.findIndex((s) => s.kind === "details");

  /* ---------- Save and resume (sessionStorage; never name or email) ---------- */

  useEffect(() => {
    const d = parseDraft(storage.get(DRAFT_KEY));
    if (d) setResumeDraft(d);
  }, []);

  useEffect(() => {
    if (stepIndex === 0 || reveal || resumeDraft) return;
    const draft: Draft = { v: 1, seed, stepIndex, answers, pilotAnswers, prefs, context, timings: timings.current, detailsDone };
    storage.set(DRAFT_KEY, JSON.stringify(draft));
  }, [stepIndex, answers, pilotAnswers, prefs, context, detailsDone, seed, reveal, resumeDraft]);

  function resume(d: Draft) {
    setSeed(d.seed);
    setAnswers(d.answers);
    setPilotAnswers(d.pilotAnswers);
    setPrefs({ ...EMPTY_DRAFT, ...d.prefs } as DraftPreferences);
    setContext(d.context);
    setDetailsDone(d.detailsDone);
    timings.current = d.timings;
    setResumeDraft(null);
    setStepIndex(Math.min(d.stepIndex, steps.length - 1));
  }

  function restart() {
    storage.remove(DRAFT_KEY);
    setResumeDraft(null);
    setStepIndex(0);
  }

  /* ---------- Navigation ---------- */

  // Timings: first question shown, and the start of Part 2.
  useEffect(() => {
    if (step.kind === "part1") timings.current.startedAt ??= now();
    if (step.kind === "trait") timings.current.part2StartedAt ??= now();
  }, [step]);

  // Move focus to the new question's heading on every step change.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
  }, [stepIndex, resumeDraft, reveal]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      const target = Math.max(0, Math.min(i, steps.length - 1));
      const direction = target >= indexRef.current ? "forward" : "back";
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      const apply = (a: "forward" | "back" | "vt") => {
        setAnim(a);
        setStepIndex(target);
        setFormError(null);
      };
      if (doc.startViewTransition && !prefersReducedMotion()) {
        document.documentElement.dataset.nav = direction;
        doc.startViewTransition(() => flushSync(() => apply("vt")));
      } else {
        apply(direction);
      }
      window.scrollTo({ top: 0 });
    },
    [steps.length],
  );

  const next = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const back = useCallback(() => goTo(indexRef.current - 1), [goTo]);
  const advanceSoon = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => goTo(indexRef.current + 1), ADVANCE_DELAY_MS);
  }, [goTo]);

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

  // Keyboard: 1-5 answers statements, left arrow goes back, Enter continues from a Part card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || resumeDraft || reveal) return;
      if (step.kind === "trait" || step.kind === "pilot") {
        const n = Number(e.key);
        if (n >= 1 && n <= 5) answerLikeMe(n);
        else if (e.key === "ArrowLeft") back();
      } else if (step.kind === "interstitial" && e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, answerLikeMe, back, next, resumeDraft, reveal]);

  /* ---------- Validation ---------- */

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

  function continueFrom(validate: () => FieldErrors, onValid?: () => void) {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    onValid?.();
    if (isLast || (step.kind === "details" && submitAfterDetails)) submit();
    else next();
  }

  /* ---------- Submit and reveal ---------- */

  async function submit() {
    if (submitting) return;
    // After resuming, name and email (never stored) must be entered again.
    if (Object.keys(validateDetails()).length) {
      setSubmitAfterDetails(true);
      goTo(detailsIndex);
      setFormError("Please confirm your details so we can save your results.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const reducedMotion = prefersReducedMotion();
    const started = performance.now();
    setReveal({ style: null, reducedMotion });

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
      meta: { presentedOrder: [...order, ...p2Order.map((r) => `P2.${r}`)], ...timings.current },
      event,
      wave,
      aid,
    }).catch(() => ({ ok: false as const, message: "Sorry, we couldn't save your answers. Please try again." }));

    if (!res.ok) {
      setReveal(null);
      setSubmitting(false);
      setFormError(res.message);
      if ("fieldErrors" in res && res.fieldErrors && Object.keys(res.fieldErrors).length) {
        setErrors(res.fieldErrors);
        const target = Object.keys(res.fieldErrors).some((k) => ["name", "email", "consent"].includes(k)) ? "details" : "part1";
        goTo(steps.findIndex((s) => s.kind === target));
      }
      return;
    }

    storage.remove(DRAFT_KEY);
    const elapsed = performance.now() - started;
    if (!reducedMotion) setReveal({ style: res.style, reducedMotion });
    const navigateAt = reducedMotion
      ? elapsed
      : Math.min(Math.max(REVEAL_MIN_MS, elapsed + REVEAL_GLOW_MS), Math.max(REVEAL_MAX_MS, elapsed));
    setTimeout(() => router.push(`/results/${res.id}`), Math.max(0, navigateAt - elapsed));
  }

  /* ---------- Rendering ---------- */

  const progress = progressFor(steps, stepIndex);
  const milestone = milestoneFor(steps, stepIndex);
  const announcement = resumeDraft ? "" : reveal ? "Working out your style" : (progress.announce ?? "");
  const live = (
    <p className="sr-only" aria-live="polite">
      {announcement}
    </p>
  );

  if (resumeDraft && stepIndex === 0) {
    return (
      <>
        {live}
        <ResumePrompt onContinue={() => resume(resumeDraft)} onRestart={restart} />
      </>
    );
  }
  if (reveal) return <RevealScreen style={reveal.style} reducedMotion={reveal.reducedMotion} />;
  if (step.kind === "intro") {
    return (
      <>
        {live}
        <IntroScreen onStart={next} />
      </>
    );
  }

  const inParts = ["part1", "trait", "pilot", "pref", "freeText"].includes(step.kind);
  const submitLabel = submitting ? "Saving…" : "See my event style";

  return (
    <section className="card question">
      {live}
      {inParts && <ProgressHeader progress={progress} stepKey={stepIndex} />}
      {milestone && <p className="eyebrow milestone">{milestone}</p>}

      <div key={stepIndex} className="q-stage" data-anim={anim}>
        {step.kind === "interstitial" && <PartCard part={step.part} onContinue={next} onBack={back} />}

        {step.kind === "details" && (
          <form
            className="form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              continueFrom(validateDetails, () => setDetailsDone(true));
            }}
          >
            <h2 className="statement" id="step-heading" tabIndex={-1} data-step-heading>
              About you
            </h2>
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
            {formError && <p className="error banner" role="alert">{formError}</p>}
            <div className="nav">
              <button type="button" className="ghost" onClick={back}>← Back</button>
              {/* aria-disabled rather than disabled, so a click still shows the error for screen-reader users. */}
              <button type="submit" className="primary" aria-disabled={!details.consent || submitting}>
                {isLast || submitAfterDetails ? submitLabel : CONSENT_BUTTON}
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
            <h2 className="sr-only" id="step-heading" tabIndex={-1} data-step-heading>
              About you
            </h2>
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
            {formError && <p className="error banner" role="alert">{formError}</p>}
            <div className="nav">
              <button type="button" className="ghost" onClick={back}>← Back</button>
              <button type="submit" className="primary">Continue →</button>
            </div>
          </form>
        )}

        {(step.kind === "trait" || step.kind === "pilot") && (
          <LikeMeQuestion
            text={step.kind === "pilot" ? PILOT_ITEMS[step.index].text : TRAIT_ITEMS.find((i) => i.id === step.id)!.text}
            instruction={step.kind === "pilot" ? PILOT_INSTRUCTION : PART2_INSTRUCTION}
            showInstruction={step.index === 0}
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
            <label htmlFor="freeText" className="statement" id="step-heading" tabIndex={-1} data-step-heading>
              {FREE_TEXT.question}
            </label>
            <p className="muted small" id="freeText-help">{FREE_TEXT.helper}</p>
            <textarea id="freeText" rows={5} maxLength={FREE_TEXT.maxLength} value={freeText} aria-describedby="freeText-help"
              onChange={(e) => setFreeText(e.target.value)} placeholder="Optional" />
            <p className="muted small right">{freeText.length} / {FREE_TEXT.maxLength}</p>
            {formError && <p className="error banner" role="alert">{formError}</p>}
            <div className="nav">
              <button type="button" className="ghost" onClick={back}>← Back</button>
              <button type="button" className="primary" disabled={submitting} onClick={() => (isLast ? submit() : next())}>
                {isLast ? submitLabel : freeText.trim() ? "Continue →" : "Skip →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
