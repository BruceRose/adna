import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** The committed example file, served as is. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorised", { status: 401 });
  const body = await readFile(path.join(process.cwd(), "docs/import/audiencedna-import-example.csv"));
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audiencedna-import-example.csv"',
      "Cache-Control": "no-store",
    },
  });
}
