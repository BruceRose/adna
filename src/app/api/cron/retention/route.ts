import { timingSafeEqual } from "node:crypto";
import { purgeExpiredResponses } from "@/lib/responses";

export const dynamic = "force-dynamic";

/**
 * Daily retention job (see vercel.json). Protected by CRON_SECRET, sent as
 * "Authorization: Bearer <CRON_SECRET>" (Vercel Cron does this automatically).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }
  const anonymised = await purgeExpiredResponses(new Date());
  return Response.json({ ok: true, anonymised });
}
