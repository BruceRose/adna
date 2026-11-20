"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { ResponseMeta } from "@/lib/db/schema";
import { getResponse, insertResponse, isUuid, updateResponsePreferences } from "@/lib/responses";
import { QUESTIONNAIRE_VERSION, type Preferences } from "@/lib/v3/items";
import { scoreV3 } from "@/lib/v3/scoring";
import {
  preferencesSchema,
  sanitiseMeta,
  submissionSchema,
  type FieldErrorKey,
  type FieldErrors,
  type Submission,
} from "@/lib/v3/validation";

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors?: FieldErrors; message: string };

const FIELD_KEYS: FieldErrorKey[] = ["name", "email", "consent", "industry", "industryOther", "role", "eventsAttended"];

export async function submitResponse(input: Submission): Promise<SubmitResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const [group, key] = issue.path;
      if ((group === "details" || group === "context") && FIELD_KEYS.includes(key as FieldErrorKey)) {
        fieldErrors[key as FieldErrorKey] ??= issue.message;
      }
    }
    return {
      ok: false,
      fieldErrors,
      message: Object.keys(fieldErrors).length
        ? "Please check your answers to the highlighted questions."
        : "Some answers are missing. Please go back and answer every question.",
    };
  }

  const { details, context, answers, pilotAnswers, preferences, freeText, event, wave, aid } = parsed.data;
  const now = Date.now();
  const clientMeta = sanitiseMeta(parsed.data.meta, now);
  const ua = (await headers()).get("user-agent") ?? "";
  const meta: ResponseMeta = {
    ...clientMeta,
    submittedAt: new Date(now).toISOString(),
    userAgentClass: /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop",
  };

  // Always score on the server, with the current questionnaire version.
  const score = scoreV3(answers, preferences.P1, clientMeta);

  try {
    const id = await insertResponse({
      name: details.name,
      email: details.email,
      industry: context.industry,
      industryOther: context.industry === "Other" ? (context.industryOther ?? null) : null,
      event: event ?? null,
      wave: wave ?? null,
      attendeeRef: aid ?? null,
      consentAt: new Date(now),
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      normsVersion: score.normsVersion,
      context: { role: context.role, eventsAttended: context.eventsAttended },
      answers,
      preferences: preferences as Preferences,
      scaleScores: score.scaleScores,
      axes: score.axes,
      style: score.style,
      styleNeighbour: score.styleNeighbour,
      badges: score.badges,
      qualityFlags: score.qualityFlags,
      freeText: freeText ?? null,
      meta,
      pilotAnswers: pilotAnswers ?? null,
    });
    return { ok: true, id };
  } catch (err) {
    console.error("Failed to save response", err);
    return { ok: false, message: "Sorry, we couldn't save your answers. Please try again." };
  }
}

const MAX_PREFERENCE_EDITS = 10;

/**
 * Update a respondent's Part 3 preferences from their results page. The
 * results URL is the only credential (as for viewing results), so edits are
 * limited per response. P1 (reasons for attending) is kept as originally
 * answered, so the motivation badge doesn't change.
 */
export async function updatePreferences(
  id: string,
  input: Preferences,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isUuid(id)) return { ok: false, message: "Response not found." };
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please answer every question." };

  const row = await getResponse(id);
  if (!row) return { ok: false, message: "Response not found." };
  const edits = row.meta.preferencesEditCount ?? 0;
  if (edits >= MAX_PREFERENCE_EDITS) {
    return { ok: false, message: "You've reached the limit for editing your preferences." };
  }

  await updateResponsePreferences(
    id,
    { ...(parsed.data as Preferences), P1: row.preferences.P1 },
    { ...row.meta, preferencesEditedAt: new Date().toISOString(), preferencesEditCount: edits + 1 },
  );
  revalidatePath(`/results/${id}`);
  return { ok: true };
}
