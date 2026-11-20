/**
 * App-level settings.
 */

/**
 * Where the name/email/consent screen appears in the questionnaire. Ship with
 * "start"; "end" exists for a later A/B test.
 */
export const DETAILS_POSITION: "start" | "end" = "start";

/** The data controller named in the consent text. */
export const CONTROLLER_NAME = "Live Group";

/** Live Group's privacy notice, linked from the consent text. */
export const PRIVACY_POLICY_URL = "https://livegroup.co.uk/privacy-policy/";

/** Where people send access, correction and deletion requests. */
export const DATA_CONTACT_EMAIL = "hello@livegroup.co.uk";

/**
 * After this many months, a response's personal details (name, email,
 * attendee reference, free text) are deleted by the daily retention job.
 * Industry and de-identified answers are kept.
 */
export const RETENTION_MONTHS = 12;

/**
 * Version of the consent wording shown on the details screen. Stored on each
 * response. Bump it whenever the consent copy changes.
 */
export const CONSENT_VERSION = "2026-11-20";
