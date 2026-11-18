# Audience DNA

A web app that captures a respondent's name, email and industry, asks the 16
Audience DNA statements on a 1–6 agreement scale, works out their profile, shows it
to them and stores everything for your team.

It replaces the scoring in `FinalADNA_Analysis.xlsx`. The scoring engine is tested
against all 85 rows of that spreadsheet and gives identical results.

## Quick start (local)

Requires Node.js 20.9 or later.

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD and SESSION_SECRET
npm run dev
```

- Questionnaire: http://localhost:3000
- Admin: http://localhost:3000/admin

With `DATABASE_URL` left empty, the app uses an embedded Postgres (PGlite) stored in
`./data/pglite`. You don't need to install a database.

## How scoring works

Each statement leans towards one side of a pair:

| Pair | Statements |
|---|---|
| Thinking / Feeling | 1, 5, 9, 13 |
| Extrovert / Introvert | 2, 6, 10, 14 |
| Judging / Perceiving | 3, 7, 11, 15 |
| Sensing / Intuition | 4, 8, 12, 16 |

- An answer of 6 / 5 / 4 gives **3 / 2 / 1 points** to the side the statement leans towards.
- An answer of 3 / 2 / 1 gives **1 / 2 / 3 points** to the opposite side.
- The side with more points wins that pair's letter. **Ties go to T, E, J and S**, the same as the
  spreadsheet's `IF(x>y, …)` formulas.
- The four letters form a code such as `TEJI`, which maps to one of 16 profiles (Strategist, etc.).
  As in the spreadsheet, the 4th letter uses `I` for Intuition.
- Profile names and the short descriptions shown on the results page come from the
  *Full Profiles* document. **Note:** the original spreadsheet had TIPI = Pragmatist and
  TIPS = Theorist. The app follows the document instead (TIPS = Pragmatist,
  TIPI = Theorist), because that's what the descriptions fit.

All of this, plus the statement text, scale labels, profile names and
descriptions and the industry list, is set in **`src/lib/questionnaire.ts`**. The scoring
logic is in `src/lib/scoring.ts`.

Each response stores its raw answers, the eight pole scores, the code, the profile and a
`questionnaire_version`. If you change statements or scoring, bump
`QUESTIONNAIRE_VERSION` so old and new results can be told apart.

## Admin area

`/admin` is protected by a single shared password (`ADMIN_PASSWORD`). It has:

- a list of responses with search (name/email), industry and profile filters
- a profile-mix summary
- a page per response with every answer and the points it scored
- **Export Excel / Export CSV**, which use the current filters. The column layout follows the
  original spreadsheet: identity, the 16 statements, 8 pole scores, 4 letters, code, profile
- deleting an individual response (e.g. for GDPR erasure requests)

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | Postgres connection string. Empty means the embedded local database. |
| `ADMIN_PASSWORD` | Yes | Password for `/admin`. |
| `SESSION_SECRET` | Yes | Random string, 32+ characters, used to sign admin sessions (`openssl rand -base64 48`). |
| `PGLITE_DATA_DIR` | No | Where to keep the embedded database (default `./data/pglite`). |

## Deploying

The app is a standard Next.js app on any Postgres, so the hosting is up to you:

- **Vercel + Supabase/Neon**: import the repo into Vercel and set the three env vars, using the
  provider's Postgres connection string as `DATABASE_URL` (pooled connection, `sslmode=require`).
- **Azure**: App Service (Node 20+) with Azure Database for PostgreSQL.
  Run `npm run build` then `npm start`.
- **Any server / Docker**: `npm ci && npm run build && npm start` (port 3000, override with `-p`).

Database migrations (in `./drizzle`) run automatically on first request. You can also
run them yourself with `npm run db:migrate`.

Note: the embedded PGlite database is for local use and demos only. It needs a
persistent disk and a single server process, so use real Postgres in production.

## Development

```bash
npm test            # scoring tests (incl. all 85 spreadsheet rows)
npm run typecheck
npm run build
```

Changing the database schema: edit `src/lib/db/schema.ts`, run `npm run db:generate`,
and commit the new file in `./drizzle`.

## Project layout

```
src/lib/questionnaire.ts   statements, pairs, profiles, scale, industries
src/lib/scoring.ts         scoring engine (pure functions)
src/lib/validation.ts      input validation (zod)
src/lib/db/                schema + connection (Postgres or embedded PGlite)
src/lib/responses.ts       data access
src/lib/export.ts          CSV / Excel export
src/lib/auth.ts            admin session
src/app/                   pages: questionnaire, results, admin
tests/                     scoring tests + spreadsheet fixture
```
