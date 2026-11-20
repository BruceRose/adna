/**
 * Consent notice shown on the details screen (v3.1 spec 2.2). Bump
 * CONSENT_VERSION in config.ts whenever this copy changes.
 *
 * One deliberate change from the spec: the retention line reflects Live
 * Group's policy (personal details deleted after RETENTION_MONTHS; industry
 * and de-identified answers kept), not "then we delete it".
 */
import { CONTROLLER_NAME, DATA_CONTACT_EMAIL, PRIVACY_POLICY_URL, RETENTION_MONTHS } from "./config";

export const INTRO_CONSENT_LINE =
  "We'll ask for your name and email so we can save your results. You'll see exactly how we use your information before you start.";

export const CONSENT_HEADING = "How we use your information";

export interface ConsentBullet {
  key: string;
  title: string;
  text: string;
  /** Shown only when the link included ?aid=. */
  aidOnly?: boolean;
}

export const CONSENT_BULLETS: ConsentBullet[] = [
  {
    key: "collect",
    title: "What we collect:",
    text: "your name and email address, your answers, the industry and role you choose, and basic technical details such as how long you took and whether you used a phone or a computer. If you came from an event link, we also record which event.",
  },
  {
    key: "why",
    title: "Why:",
    text: "to work out your event style and show you your results, and to help Live Group and the organisers of events you attend design better events. We also use de-identified answers to check and improve how well AudienceDNA works.",
  },
  {
    key: "who",
    title: "Who sees it:",
    text: "Live Group's team can see individual responses. Event organisers and clients only see combined results for groups of 10 or more people, never your name, email address or individual answers.",
  },
  {
    key: "link",
    title: "Your results link:",
    text: "anyone with the link to your results page can see your style and preferences, so only share it if you're happy to. Shared previews never show your name.",
  },
  {
    key: "aid",
    title: "Your event app:",
    text: "because you joined through your event app, we may link your results to how you used the app, such as sessions you attended, to check how well AudienceDNA works.",
    aidOnly: true,
  },
  {
    key: "keep",
    title: "How long we keep it:",
    text: `after ${RETENTION_MONTHS} months we delete your name, email address and anything else that identifies you. We keep your industry and de-identified answers to help improve events and AudienceDNA.`,
  },
];

/** The "Your choices" bullet has links, so it is rendered separately. */
export const CONSENT_CHOICES = {
  title: "Your choices:",
  before: "you can ask us to see, correct or delete your information at any time by emailing ",
  email: DATA_CONTACT_EMAIL,
  after: ". You can also withdraw your agreement at any time. ",
  linkText: "Read our full privacy notice",
  linkUrl: PRIVACY_POLICY_URL,
};

export const CONSENT_CHECKBOX_LABEL = `I agree to ${CONTROLLER_NAME} storing and using my details and answers as described above.`;

export const CONSENT_ERROR = "Please tick the box to agree before continuing.";

export const CONSENT_BUTTON = "Agree and continue →";
