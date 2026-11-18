"use server";

import { QUESTIONNAIRE_VERSION } from "@/lib/questionnaire";
import { insertResponse } from "@/lib/responses";
import { scoreAnswers } from "@/lib/scoring";
import { submissionSchema, type FieldErrors, type Submission } from "@/lib/validation";

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors?: FieldErrors; message: string };

export async function submitResponse(input: Submission): Promise<SubmitResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "details" && typeof issue.path[1] === "string") {
        fieldErrors[issue.path[1] as keyof FieldErrors] ??= issue.message;
      }
    }
    return {
      ok: false,
      fieldErrors,
      message: Object.keys(fieldErrors).length
        ? "Please check your details."
        : "Some answers are missing. Please go back and answer every statement.",
    };
  }

  const { details, answers } = parsed.data;
  // Always score on the server. Never trust a score sent by the browser.
  const result = scoreAnswers(answers);

  try {
    const id = await insertResponse({
      name: details.name,
      email: details.email,
      industry: details.industry,
      industryOther: details.industry === "Other" ? (details.industryOther ?? null) : null,
      consentAt: new Date(),
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      answers,
      scores: result.scores,
      code: result.code,
      profile: result.profile,
    });
    return { ok: true, id };
  } catch (err) {
    console.error("Failed to save response", err);
    return { ok: false, message: "Sorry, we couldn't save your answers. Please try again." };
  }
}
