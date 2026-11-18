export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(d);
}

export function industryLabel(r: { industry: string; industryOther: string | null }): string {
  return r.industryOther ? `Other: ${r.industryOther}` : r.industry;
}
