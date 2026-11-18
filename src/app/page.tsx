import { Questionnaire } from "./Questionnaire";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { event } = await searchParams;
  return <Questionnaire event={typeof event === "string" ? event.slice(0, 100) : undefined} />;
}
