import { RETENTION_MONTHS } from "./config";

/**
 * Responses created before this moment are past the retention period.
 * Calendar months, in UTC (e.g. 12 months before 20 Nov 2026 is 20 Nov 2025).
 */
export function retentionCutoff(now: Date, months: number = RETENTION_MONTHS): Date {
  const d = new Date(now.getTime());
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}
