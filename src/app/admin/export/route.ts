import { isAdmin } from "@/lib/auth";
import { toCsv, toXlsx } from "@/lib/export";
import { allResponses, filtersFromParams } from "@/lib/responses";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorised", { status: 401 });

  const url = new URL(req.url);
  const filters = filtersFromParams(Object.fromEntries(url.searchParams));
  const rows = await allResponses(filters);
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store" };

  if (url.searchParams.get("format") === "csv") {
    return new Response(toCsv(rows), {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audience-dna-${stamp}.csv"`,
      },
    });
  }

  return new Response(new Uint8Array(await toXlsx(rows)), {
    headers: {
      ...headers,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="audience-dna-${stamp}.xlsx"`,
    },
  });
}
