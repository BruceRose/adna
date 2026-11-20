/**
 * The public site URL, for canonical links and share text. Set SITE_URL in
 * production (e.g. https://audiencedna.livegroup.co.uk); on Vercel the
 * production domain is used automatically.
 */
export const SITE_URL = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/** Host only, e.g. "audiencedna.livegroup.co.uk", for share images. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
