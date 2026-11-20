import { randomInt } from "node:crypto";
import { Questionnaire } from "./Questionnaire";

export const dynamic = "force-dynamic";

/**
 * Link parameters:
 *   ?event=summit-2027  tag responses with an event
 *   ?wave=retest        tag a data-collection wave (e.g. a retest)
 *   ?aid=AB123          external attendee id, for linking behavioural data
 *   ?pilot=1            add the 12 marker items (pilot studies only)
 * All are sanitised again on the server.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const one = (k: string) => (typeof p[k] === "string" ? (p[k] as string).slice(0, 100) : undefined);
  return (
    <Questionnaire
      // Seeds the per-respondent statement order. Generated on the server so it matches on hydration.
      seed={randomInt(0, 2 ** 31)}
      event={one("event")}
      wave={one("wave")}
      aid={one("aid")}
      pilot={one("pilot") === "1"}
    />
  );
}
