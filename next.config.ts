import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep database drivers out of the bundle (PGlite ships WASM files).
  serverExternalPackages: ["@electric-sql/pglite", "pg", "exceljs"],
  // Bundle migration SQL with the server so it can migrate on start-up.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*", "./docs/import/**/*"] },
};

export default nextConfig;
