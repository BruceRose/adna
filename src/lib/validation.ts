import { z } from "zod";
import { INDUSTRIES, OTHER_INDUSTRY, STATEMENTS } from "./questionnaire";

const answerValue = z.number().int().min(1).max(6);

export const detailsSchema = z
  .object({
    name: z.string().trim().min(1, "Please enter your name").max(200),
    email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address")).pipe(z.string().max(320)),
    industry: z.enum([...INDUSTRIES, OTHER_INDUSTRY], { error: "Please choose your industry" }),
    industryOther: z.string().trim().max(200).optional(),
    consent: z.literal(true, { error: "Please confirm you're happy for us to store your answers" }),
  })
  .refine((d) => d.industry !== OTHER_INDUSTRY || (d.industryOther && d.industryOther.length > 0), {
    path: ["industryOther"],
    message: "Please tell us your industry",
  });

export const answersSchema = z.strictObject(
  Object.fromEntries(STATEMENTS.map((s) => [s.id, answerValue])) as Record<string, typeof answerValue>,
);

export const submissionSchema = z.object({
  details: detailsSchema,
  answers: answersSchema,
});

export type Details = z.input<typeof detailsSchema>;
export type Submission = z.input<typeof submissionSchema>;
export type FieldErrors = Partial<Record<keyof Details, string>>;
