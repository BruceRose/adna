# Audience DNA (v3.1)

A web app that finds out how people like to experience work events, then turns
that into advice for them and for the people organising, writing for and
presenting to them.

- **Respondents** answer about 6 minutes of questions and get an **event style**
  (one of nine), two optional badges, an honest picture of where they sit, and
  recommendations based mainly on what they told us.
- **Planners, content teams and clients** can turn any group of respondents into an
  **audience report**: a style heatmap, how the audience leans on each axis, what it
  wants (with margins of error), and a playbook. Reports can be shared through a
  read-only client link or saved as a PDF.
- **Anyone** can browse the nine styles at `/styles` (public, indexable pages).
- **Admins** can import responses collected elsewhere (paper forms, Microsoft Forms,
  Typeform) from a CSV template.

v3.1 (November 2026) adds the logo, an upfront consent notice with versioning and a
retention job, the public style pages, a UI pass and the CSV import tool. It does not
change the questionnaire, scoring or norms (`QUESTIONNAIRE_VERSION` is still `"3"`).

v3 replaces the earlier 16-type model (v1/v2). The reasons are set out in
*AudienceDNA Questionnaire: Psychometric Review and Recommendations* (Live Group,
November 2026) and the v3 redevelopment specification. Data from the earlier models
was deliberately discarded when v3 was deployed (see "Upgrading from v2").

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
`./data/pglite`, so you don't need to install a database.

## The questionnaire

| Screen | Content |
|---|---|
| Intro | What to expect (about 6 minutes) |
| Details | Name, email, consent. Position set by `DETAILS_POSITION` in `src/lib/config.ts` (`"start"` now; `"end"` exists for a later A/B test) |
| Part 1: About you | C1 industry, C2 role, C3 events attended in the past 12 months |
| Part 2: How you are at events | 22 statements, one per screen, on a fully labelled 5-point "like me" scale (keys 1-5 work) |
| Part 3: Your event preferences | P1-P8: reasons for attending, ways of meeting people, how they like to take part, what convinces them, session length, communication tone, information wanted, pace |
| Free text | Optional, up to 1,000 characters |

Part 2 statements are shown in a per-respondent random order in which no two
consecutive statements come from the same scale (fixed fallback order after 200
failed attempts). The order shown is stored with each response.

All wording lives in `src/lib/v3/items.ts` and is final: don't paraphrase it
without a new version.

**How the flow behaves** (`src/app/Questionnaire.tsx`, logic in `src/lib/v3/flow.ts`):

- a short card before each Part, with a three-part map (Enter continues);
- a three-segment progress bar, "Part 2 of 3 · Statement 7 of 22", and a time-left
  estimate (8 seconds per statement, 15 per Part 3 question, hidden under a minute);
- milestone messages at the halfway point, after the last statement and on the free-text
  screen;
- answers register visibly before moving on (380ms); keys 1-5 work on statements;
- **save and resume**: progress is kept in `sessionStorage` (`adna-draft-v3`) for the
  browser tab, without name or email. A resumed draft asks for name and email again
  before submitting;
- a short "Working out your style…" reveal (1.2-2.5s including the request; a spinner
  under reduced motion);
- focus moves to each new question, and progress is announced to screen readers.

## Consent and retention

The details screen shows the full notice "How we use your information" above the
checkbox (copy in `src/lib/consent.ts`). The checkbox is unticked and required; the button
reads "Agree and continue". The event-app bullet appears only when the link has `?aid=`.

- **Version:** each web response stores `consent_version` (`CONSENT_VERSION` in
  `src/lib/config.ts`, currently `2026-11-20`). **Bump it whenever the consent copy
  changes.** Imported responses store `import` plus the consent source from the file.
- **Contacts:** `PRIVACY_POLICY_URL`, `DATA_CONTACT_EMAIL`, `CONTROLLER_NAME` and
  `RETENTION_MONTHS` are in `src/lib/config.ts`.
- **Retention (Live Group policy):** after `RETENTION_MONTHS` (12) a response's personal
  details (name, email, attendee reference and free text) are deleted and the response
  is marked anonymised. Industry and the de-identified answers are kept, so audience
  reports and research still work. The consent notice says this. (This differs from the
  v3.1 spec, which deleted whole responses.)
- **How it runs:** `/api/cron/retention`, protected by `CRON_SECRET` (sent as
  `Authorization: Bearer …`), runs daily at 03:17 UTC through `vercel.json`. On other hosts,
  schedule a daily call to that URL with the header. Admins also see a banner on
  Responses when anything is due, with a "Delete now" button.

## Scoring

All scoring is in pure, tested functions in `src/lib/v3/scoring.ts`, always run on
the server.

1. **Five scales** (means on 1-5, after reverse-scoring `key: -1` items as 6 - answer):
   Social energy (SE), Social initiative (SI), Depth of processing (DP), Openness to
   new experiences (NO), Need for structure (NS). Each scale is exactly balanced
   between positive and reverse-keyed items, so someone who agrees (or disagrees)
   with everything scores 3.0 on every scale. A scale is only scored if at least 75%
   of its items are answered.
2. **Two axes**: Connecting = mean of the 8 SE and SI items; Ideas = mean of the 8 DP
   and NO items.
3. **Levels** from the cut points in `src/lib/norms.ts`: Connecting is Selective,
   Adaptable or Sociable; Ideas is Applied, Balanced or Exploratory.
4. **Nine styles** on the 3 x 3 grid:

   | Connecting \ Ideas | Applied | Balanced | Exploratory |
   |---|---|---|---|
   | Sociable | Activator | Connector | Innovator |
   | Adaptable | Pragmatist | All-Rounder | Explorer |
   | Selective | Analyst | Observer | Scholar |

5. **Neighbouring style**: if a score is within one standard error of measurement
   (SEM) of a cut point, the style across that cut is shown as "with a touch of...".
6. **Badges**: Planner / Free-roamer from Need for structure; a motivation badge
   ("Here to learn and connect") from P1.
7. **Quality flags** (never shown to respondents): `straightline`, `contradiction`,
   `fast` (Part 2 under 60 seconds) and `acquiescence`. Flagged responses are left out
   of audience reports.

Respondents never see numeric scores or percentages. Admins do.

Styles are a communication layer over continuous scores, not natural types. The
results page says so, and recommendations are driven mainly by stated preferences
(`src/lib/v3/recommendations.ts`).

## Norms and how to update them

`src/lib/norms.ts` holds the cut points, SDs and reliabilities used for levels and
SEM bands. **The current values are provisional** (`provisional-2026-11`).

After the pilot (n >= 500):

1. Set each axis's `cuts` to the pilot's 25th and 75th percentiles, and Need for
   structure's likewise.
2. Set `sd` and `reliability` from the pilot data (check each axis coheres:
   omega >= 0.80).
3. **Change `version`** (e.g. `pilot-2027-03`). Every response records the norms
   version it was scored with, so old and new can be told apart.
4. Run `npm test`: the tests that use specific cut values will tell you what moved.

Existing responses keep their stored scores, levels and styles. Re-scoring
historical data under new norms is a deliberate, separate exercise.

## Research hooks

| Hook | How | Stored in |
|---|---|---|
| Event tag | `?event=summit-2027` | `event` |
| Data-collection wave (e.g. a 2-4 week retest) | `?wave=retest` | `wave` |
| External attendee id, to link event-app behaviour | `?aid=AB123` | `attendee_ref` |
| Pilot marker items (12 Mini-IPIP items) | `?pilot=1` | `pilot_answers` |
| Timings | automatic | `meta.startedAt`, `part2StartedAt`, `part2EndedAt`, `submittedAt` |
| Presented order (Part 2 and P2 rows) | automatic | `meta.presentedOrder` |
| Device class | automatic | `meta.userAgentClass` |

Parameters can be combined: `/?event=summit-2027&wave=retest&aid=AB123`. All are
sanitised on the server. Client timestamps are kept only if they are valid and within
the last 24 hours.

**Before running a pilot with `?pilot=1`**, check the 12 marker items in
`src/lib/v3/items.ts` against ipip.ori.org. They were entered from the
specification but couldn't be checked against the IPIP site during the build.

**Research export**: in Admin > Responses, "Research export (item-level, no names or
emails)" downloads the full item-level CSV with names and emails removed and each
response id replaced by a SHA-256 hash of the id plus `SESSION_SECRET`. The same
response always gets the same hash (while `SESSION_SECRET` is unchanged), so separate
exports can be joined. Retest waves can be linked to first responses via `attendee_ref`.

## Style pages

`/styles` explains the two axes and shows an interactive 3 x 3 grid (arrow keys move
between styles). `/styles/<style>` (e.g. `/styles/all-rounder`) has one page per style:
about, what they get most from, what drains them, how to connect with them, how to
design for them, neighbouring styles and previous/next. All ten pages are static.

- Copy is in `src/lib/v3/styles.ts` (`about`, `getMost`, `drains`, `connect`,
  `design`) and `src/lib/v3/stylePageCopy.ts`.
- Links from a results page add `?you=<style>` (never the response id). The page then
  shows "Compared with you" (`src/lib/v3/compare.ts`, which describes differences only,
  never compatibility) and a "Back to my results" button.
- "How common" appears once there are 100 or more v3 responses (`/api/style-stats`,
  cached for an hour).
- Each style has an emblem drawn from its grid position (`src/lib/v3/emblem.ts`) and a
  colour (`--style-<id>` in `globals.css`), and its own share image.
- Set `SITE_URL` in production so canonical URLs and share images use your domain.

## Audience reports

1. Go to **Responses**, filter (event, industry, style, wave, quality), then tick
   people or use **Use all N matching**. Or save any slice from the **Insights
   explorer**.
2. The report:
   - leaves out responses with quality flags, and says how many;
   - shows only "This audience is too small to report" below 10 eligible responses
     (also enforced on the client link);
   - marks results as indicative below 30 responses;
   - shows a headline, motivation mix, style heatmap with totals, axis dot strips with
     95% confidence intervals, preference shares with margins of error, a playbook for
     planners, content and comms, and presenters, what to avoid, significant
     minorities ("Don't forget") and the share of Planners and Free-roamers.
3. **Copy client link** gives a read-only page with no names, emails or industries.
   **Reset client link** revokes it. **Print / save as PDF** gives a clean copy.

## Admin and exports

- Responses list with filters, a style mix summary and report building.
- Response detail: raw answers with keys, scale and axis scores, levels, style,
  neighbour, badges, flags, preferences, timings and presented order.
- **Excel** (sheet `v3`) and **CSV** follow spec section 10's column order; the
  research export is described above. Exports follow the current filters.

## Importing responses

Admin > **Import** brings in v3 responses collected elsewhere. It can't import data from
the retired v1 or v2 questionnaires.

1. Download the **template** (header row) or the **example** (three rows). Both are in
   `docs/import/`; the template is generated from `items.ts`, and a test checks the
   committed files stay in step with it.
2. Fill in one row per response. Codes or labels are both accepted (case, spacing and
   curly apostrophes don't matter). Separate multiple choices with `|`, e.g.
   `learn_ideas|meet_new`. Comma or semicolon delimiters both work. Every row needs
   `consent_at` (evidence of consent) and a consent source (from the file or the
   upload form's default). The page's **Column guide** lists every column.
3. **Check file** validates without writing anything. It shows totals, each error with
   its spreadsheet row and column (with a downloadable error report), and a preview with
   the computed style. Rows with errors are never imported.
4. **Import** adds the valid rows as one batch, in a single transaction. Duplicates (same
   email and event, in the database or earlier in the file) are skipped unless you choose
   "Import anyway". Each batch can be viewed (Responses filtered by batch) or undone.

Imported rows are scored exactly as web responses are. They have no timings, so the
`fast` flag never applies. Limits: 5 MB and 5,000 rows per file.

## Logo

The original artwork is `brand/audiencedna-logo.svg` (white, kept untouched). The app
uses an SVGO-optimised copy (`src/components/brand/logo.svg`) through the `Logo`
component, which draws it inline so it follows the theme: the lettering uses
`--logo-primary` and the DNA helix `--logo-secondary`. Small sizes (header and admin) crop
off the "powered by livegroup" line, which is too small to read there; share images
include it. If the logo changes, regenerate `src/components/brand/logoPaths.ts` from
the new SVG.

There is no favicon yet: the logo isn't square. Add a square mark as
`brand/audiencedna-mark.svg` and copy it to `src/app/icon.svg`.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | Postgres connection string. Empty means the embedded local database. |
| `ADMIN_PASSWORD` | Yes | Password for `/admin`. |
| `SESSION_SECRET` | Yes | Random string, 32+ characters: signs admin sessions and salts research-export hashes (`openssl rand -base64 48`). Changing it changes the hashes. |
| `PGLITE_DATA_DIR` | No | Where to keep the embedded database (default `./data/pglite`; `memory://` for an in-memory one, as the tests use). |
| `CRON_SECRET` | Production | Protects the daily retention job (`openssl rand -base64 32`). On Vercel, cron requests send it automatically. |
| `SITE_URL` | Recommended | Public URL (e.g. `https://audiencedna.livegroup.co.uk`) for canonical links and share images. On Vercel the production domain is used if unset. |

App settings (not secrets) live in `src/lib/config.ts`: `DETAILS_POSITION`,
`CONTROLLER_NAME`, `PRIVACY_POLICY_URL`, `DATA_CONTACT_EMAIL`, `RETENTION_MONTHS` and
`CONSENT_VERSION`.

## Upgrading from v2

Migration `drizzle/0003_v3.sql` **drops the v1/v2 `responses` and `audience_reports`
tables** and creates the v3 schema. It runs automatically on the first request after
deploying. Export anything you want to keep from the old admin area *before*
deploying v3.

## Deploying

A standard Next.js app on any Postgres (e.g. Vercel + Neon/Supabase, Azure App Service
+ Azure Database for PostgreSQL, or any Node server: `npm ci && npm run build && npm
start`). Migrations in `./drizzle` run automatically on first use, or with
`npm run db:migrate`. Migration `0004_v3_1` is additive (consent and import columns, and
the `import_batches` table). The retention job is scheduled in `vercel.json`.

## Development

```bash
npm test            # v3 and v3.1 tests (some use an in-memory database)
npm run typecheck
npm run build
```

The v3.1 accessibility, performance and manual checks are recorded in
`docs/qa/v3.1-checklist.md`.

Changing the database schema: edit `src/lib/db/schema.ts`, run `npm run db:generate`,
and commit the new file in `./drizzle`.

## Project layout

```
src/lib/v3/items.ts            questionnaire content (final wording), presentation order
src/lib/v3/scoring.ts          scales, axes, levels, styles, neighbour, badges, flags
src/lib/v3/styles.ts           the nine styles, grid and axis-level copy
src/lib/v3/recommendations.ts  personal recommendations
src/lib/v3/audience.ts         audience report builder
src/lib/v3/validation.ts       submission validation (zod)
src/lib/v3/exportColumns.ts    export layout and research hashing
src/lib/norms.ts               provisional norms (cut points, SD, reliability)
src/lib/v3/flow.ts             questionnaire flow: steps, progress, time left, milestones, draft
src/lib/v3/compare.ts          "Compared with you" on style pages
src/lib/v3/emblem.ts           style emblem geometry and colours
src/lib/v3/importCsv.ts        CSV import: columns, parsing, validation, scoring
src/lib/v3/buildResponse.ts    web submission to database row
src/lib/config.ts              app settings (details position, consent, retention)
src/lib/consent.ts             consent notice copy
src/lib/retention.ts           retention cutoff
src/lib/imports.ts             import batches (insert, list, undo)
src/lib/db/                    schema and connection (Postgres or embedded PGlite)
src/lib/responses.ts           responses data access
src/lib/reports.ts             saved audience reports
src/components/brand/          Logo (and the optimised SVG)
src/components/v3/             style grid, emblem, explorer, continua, questionnaire parts, results chrome
src/components/                audience report view, import tool, report tools
src/app/                       questionnaire, results (+ share image), styles, admin, import, client report (/r/...)
docs/import/                   CSV import template and example
tests/v3.test.ts               v3 spec tests 1-15
tests/v3_1.test.ts             v3.1 tests (consent, retention, styles, flow, import)
```

## After launch

The instrument is unvalidated until the validation plan is complete: cognitive
interviews, a pilot of 300-500 respondents with `?pilot=1`, a 2-4 week retest with
`?wave=retest`, predictive validation against event-app behaviour via `?aid=`, and an
A/B test of personalised recommendations. Then update the norms as described above.
If the DP and NO scales don't cohere into one axis, the planned fallback (a future version) is to
make DP the Ideas axis and turn NO into a "Novelty seeker" badge.

Results are not for hiring, selection or performance decisions.
