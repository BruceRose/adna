/**
 * Turns a validated web submission into a database row. Pure, so it can be
 * tested; the server action supplies the time and user agent.
 */
import type { z } from "zod";
import { CONSENT_VERSION } from "../config";
import type { NewResponse, ResponseMeta } from "../db/schema";
import { QUESTIONNAIRE_VERSION, type Preferences } from "./items";
import { scoreV3 } from "./scoring";
import { sanitiseMeta, type submissionSchema } from "./validation";

export type ParsedSubmission = z.output<typeof submissionSchema>;

export const userAgentClass = (ua: string): ResponseMeta["userAgentClass"] =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";

export function buildWebResponse(data: ParsedSubmission, now: number, userAgent: string): NewResponse {
  const { details, context, answers, pilotAnswers, preferences, freeText, event, wave, aid } = data;
  const clientMeta = sanitiseMeta(data.meta, now);
  const meta: ResponseMeta = { ...clientMeta, submittedAt: new Date(now).toISOString(), userAgentClass: userAgentClass(userAgent) };

  // Always score on the server, with the current questionnaire version.
  const score = scoreV3(answers, preferences.P1, clientMeta);

  return {
    name: details.name,
    email: details.email,
    industry: context.industry,
    industryOther: context.industry === "Other" ? (context.industryOther ?? null) : null,
    event: event ?? null,
    wave: wave ?? null,
    attendeeRef: aid ?? null,
    consentAt: new Date(now),
    consentVersion: CONSENT_VERSION,
    source: "web",
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
  };
}
