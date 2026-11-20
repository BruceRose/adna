# Audience DNA (v3)

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

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | Postgres connection string. Empty means the embedded local database. |
| `ADMIN_PASSWORD` | Yes | Password for `/admin`. |
| `SESSION_SECRET` | Yes | Random string, 32+ characters: signs admin sessions and salts research-export hashes (`openssl rand -base64 48`). Changing it changes the hashes. |
| `PGLITE_DATA_DIR` | No | Where to keep the embedded database (default `./data/pglite`). |

## Upgrading from v2

Migration `drizzle/0003_v3.sql` **drops the v1/v2 `responses` and `audience_reports`
tables** and creates the v3 schema. It runs automatically on the first request after
deploying. Export anything you want to keep from the old admin area *before*
deploying v3.

## Deploying

A standard Next.js app on any Postgres (e.g. Vercel + Neon/Supabase, Azure App Service
+ Azure Database for PostgreSQL, or any Node server: `npm ci && npm run build && npm
start`). Migrations in `./drizzle` run automatically on first use, or with
`npm run db:migrate`.

## Development

```bash
npm test            # v3 scoring, recommendations, audience, validation and export tests
npm run typecheck
npm run build
```

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
src/lib/config.ts              DETAILS_POSITION
src/lib/db/                    schema and connection (Postgres or embedded PGlite)
src/lib/responses.ts           responses data access
src/lib/reports.ts             saved audience reports
src/components/v3/             style grid, continua, preference inputs and editor
src/components/                audience report view, share and report tools
src/app/                       questionnaire, results (+ share image), admin, client report (/r/...)
tests/v3.test.ts               spec tests 1-15
```

## After launch

The instrument is unvalidated until the validation plan is complete: cognitive
interviews, a pilot of 300-500 respondents with `?pilot=1`, a 2-4 week retest with
`?wave=retest`, predictive validation against event-app behaviour via `?aid=`, and an
A/B test of personalised recommendations. Then update the norms as described above.
If the DP and NO scales don't cohere into one axis, the planned fallback (v3.1) is to
make DP the Ideas axis and turn NO into a "Novelty seeker" badge.

Results are not for hiring, selection or performance decisions.
