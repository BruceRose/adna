import { isAdmin } from "@/lib/auth";
import { templateCsv } from "@/lib/v3/importCsv";

export const dynamic = "force-dynamic";

/** The import template: header row generated from items.ts (UTF-8 with BOM, CRLF). */
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorised", { status: 401 });
  return new Response(templateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audiencedna-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
