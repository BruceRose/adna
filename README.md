# Audience DNA

A web app that captures a respondent's name, email and industry and asks 20
quick statements on a 6-point Disagree ↔ Agree scale. It then works out their
Audience DNA profile and gives them a personal report covering how they like to
connect, the event formats that suit them, how to communicate with them, and
which profiles they'll click with.

For organisers, responses can be tagged to an event. The **Audience insights**
page then shows that audience's make-up, with recommendations for event design
and comms.

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

## How scoring works (version 2)

There are four pairs of traits ("strands"). Each pair has 5 statements:

| Strand | Pair | Code letters |
|---|---|---|
| Decisions | Thinking (Logic) / Feeling (Empathy) | T / F |
| Energy | Extrovert (Outgoing) / Introvert (Reflective) | E / I |
| Approach | Judging (Planned) / Perceiving (Flexible) | J / P |
| Information | Sensing (Practical) / Intuition (Big-picture) | S / I |

- Every statement leans towards one side of its pair. Within each pair the statements lean both ways
  (3 one way, 2 the other), and across all 20 exactly 10 lean towards each side of the code. This stops
  people who just tend to agree from being pushed one way.
- An answer of 6 / 5 / 4 gives **5 / 3 / 1 points** to the side the statement leans towards. An answer
  of 3 / 2 / 1 gives **1 / 3 / 5 points** to the other side. The steps are equal across the whole scale.
- Every answer scores an odd number of points, and five odd numbers can't add up to zero, so **a pair can never
  tie**. In version 1, 41% of respondents had at least one tie, which was settled by a fixed T/E/J/S rule.
- The four winning letters make the code (e.g. `TEJI` = Strategist), as before. Each strand also gets a
  **lean**: how far towards the winning side the person sits (e.g. "80% Outgoing, strong lean").

**Version 1** (the original 16 statements and 3/2/1 scoring from the spreadsheet) is kept in the code.
Older responses still display and export correctly, and a test confirms it still matches all 85 rows of
the original spreadsheet.

Profile names follow the *Full Profiles* document. Note that the original spreadsheet had TIPI =
Pragmatist and TIPS = Theorist; the app uses the document's version (TIPS = Pragmatist, TIPI = Theorist).

**Where to edit things**
- Statements, scale, profiles (names, taglines, strengths, descriptions) and industries:
  `src/lib/questionnaire.ts`
- The personal report and organiser recommendations: `src/lib/insights.ts`. Copy is written once per
  trait and combined for each person, so all 16 profiles get specific guidance.
- Scoring: `src/lib/scoring.ts`

If you change statements or scoring, add a new entry to `VERSIONS` and bump `QUESTIONNAIRE_VERSION`.

## The personal report

After answering, respondents see:
- their profile name, tagline and three strengths
- a personal DNA strand graphic, coloured by strand and taller where they lean more strongly
- their lean on each of the four strands
- how they like to connect, the event formats that suit them, how to get through to them, and what drains them
- **Find your people**: the four profiles that differ by one letter (natural allies) and their exact opposite
  (their "stretch connection")
- a share button. Shared links show a preview card with the profile but no personal details.

## Events and audience insights

Add `?event=` and a name to the questionnaire link, e.g.

```
https://your-site/?event=summit-2027
```

Everyone using that link is tagged with the event. In the admin area, **Audience insights** shows, for any
event and/or industry:
- how many people responded, and the audience's "typical" profile
- the split on each strand
- recommendations for **event design** and **comms**, based on which way the audience leans (or a "cater for
  both" recommendation when it's mixed)
- the profile mix

## Admin area

`/admin` is protected by a single shared password (`ADMIN_PASSWORD`). It has:

- a list of responses with search (name/email), industry and profile filters
- a profile-mix summary
- a page per response with every answer and the points it scored
- an event filter
- **Export Excel / Export CSV**, which use the current filters. The layout follows the original spreadsheet:
  identity (including event and version), the statements, 8 pole scores, 4 letters, 4 % leans, code, profile
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
npm test            # scoring, report and validation tests (incl. all 85 spreadsheet rows)
npm run typecheck
npm run build
```

Changing the database schema: edit `src/lib/db/schema.ts`, run `npm run db:generate`,
and commit the new file in `./drizzle`.

## Project layout

```
src/lib/questionnaire.ts   statements, pairs, profiles, scale, industries, versions
src/lib/scoring.ts         scoring engine (pure functions)
src/lib/insights.ts        personal report + audience insights content and logic
src/lib/validation.ts      input validation (zod)
src/lib/db/                schema + connection (Postgres or embedded PGlite)
src/lib/responses.ts       data access
src/lib/export.ts          CSV / Excel export
src/lib/auth.ts            admin session
src/components/            DNA helix, strand spectrums, share button
src/app/                   pages: questionnaire, results (+ share image), admin, insights
tests/                     scoring tests + spreadsheet fixture
```
