# Decisions & Trade-offs

## D1. Strict TypeScript, shared base config

- **Decision:** A root `tsconfig.base.json` with `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `verbatimModuleSyntax`. Each workspace extends it. ESM with `moduleResolution: "Bundler"`, and `tsc` is used only for type-checking (`noEmit`).
- **Why:** The extra strict flags catch unchecked index access and `undefined` vs. missing-property bugs, which matter for request parsing and SQL row mapping. One base config keeps all three packages equally strict.
- **Trade-off:** There is no compiled `dist` yet, so running the server needs a TS runner or build step (see D9).

## D2. Monorepo with npm workspaces; `/shared` exports TS source

- **Decision:** `backend`, `frontend` and `shared` are npm workspaces. `@hr/shared` points `exports` straight at `src/index.ts`, with no build step.
- **Why:** API contract types are written once and used by both sides, so the compiler catches backend/frontend drift. Vite and Vitest both consume TS source natively.
- **Trade-off:** `shared` can't be consumed by plain Node without a TS-aware runner. That's acceptable because it's never published.

## D3. Testing layout

- **Decision:** Vitest tests live in `backend/test/**`, mirroring `src` layers (routes / services / repositories). Route tests use Supertest against `createApp()`.
- **Why:** `createApp()` is a factory that never calls `listen`. Tests get a fresh app per test, with no ports and no shared state. Later it will accept dependencies (an in-memory DB), so tests need no mocks.

## D4. Linting & formatting

- **Decision:** ESLint flat config at the root (`typescript-eslint` strict, `no-explicit-any` as an error, `consistent-type-imports`, react-hooks rules for the frontend) and Prettier for formatting, with `eslint-config-prettier` turning off the rules that overlap.
- **Why:** One config for the whole repo. ESLint finds bugs and Prettier owns style, so they never argue.

## D5. Frontend scaffold is minimal

- **Decision:** Vite + React + TS only, for now. shadcn/ui, TanStack Table and Recharts get added when the first UI feature needs them.
- **Why:** No dependency before there's a use for it. shadcn/ui also needs Tailwind, now approved (see D9).

## D6. Schema

See [schema.md](schema.md). In short: current salary is denormalised onto `employees` for fast aggregation, history goes in `salary_history` (both written in one transaction), money is stored as integer minor units, and reference/FX data lives in `/shared` constants.

## D7. Confirmed domain assumptions

Confirmed with the product owner (me): salary is paid in the employee's country currency, money is stored as integer minor units, and email is unique per employee. See [requirements.md](requirements.md).

## D8. Hard delete for employees

- **Decision:** Deleting an employee removes the row, and `ON DELETE CASCADE` removes their salary history.
- **Why:** It's the simplest model that matches the MVP. There are no termination workflows and no audit requirement.
- **Trade-off:** Deleted data can't be recovered, and history is lost for leavers. A real HR system needs an employment end date (soft delete) and an audit trail; those are future improvements, and the schema can be extended without breaking anything.

## D9. Approved dependencies

- ESLint extras: `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-react-hooks`, `globals`.
- `tsx` to run TS in dev (server, seed script). Production uses a `tsc` build.
- Tailwind CSS, because shadcn/ui needs it. Added with the first UI feature.

## D10. Format validation in Zod, integrity invariants in the DB

- **Decision:** The schema enforces only integrity invariants: foreign keys, cascade delete, unique email (case-insensitive) and `salary_minor > 0`. Format rules (non-blank name, ISO country/currency code shape, currency matching country) are validated with Zod at the API boundary.
- **Why:** Zod can return field-level, user-readable errors, and each rule is written in one place. DB CHECKs would duplicate those rules and only surface as generic `SQLITE_CONSTRAINT` errors. The salary CHECK stays because a non-positive salary would silently corrupt every aggregate.
- **Trade-off:** Anything that writes to the DB without going through the API (the seed script, manual SQL, a future import job) bypasses format rules and could store e.g. `country_code = 'Germany'`. Mitigation: the seed builds rows from the same typed constants in `/shared`, and any future write path should reuse the Zod schemas.

## Seed (Chunk 1)

- **D11.** The seed is split into a pure `generateEmployees({ seed, count })` and a DB-writing `seedDatabase`, so determinism is tested without a DB and all SQL stays in the repository.
- **D12.** Random numbers come from an inline mulberry32 generator (about 10 lines) instead of faker, so there's no dependency and output is fully reproducible across machines. `Math.random` and `Date.now` are never used; dates come from a fixed base date plus a seeded offset.
- **D13.** Salary bands are defined once per role in USD and turned into local bands with a per-country pay factor and the static FX rate (`salaryBandFor` in `/shared`). That's 16 roles × 10 countries without 160 hand-maintained bands. Trade-off: real local pay doesn't scale uniformly.
- **D14.** The reference data (countries, currencies with minor-unit digits, FX rates, job titles) lives in `/shared` as typed constants. JPY has 0 minor units, so `salary_minor` is in yen.
- **D15.** Unique emails come from `first.last` plus a numeric suffix on collision. Accents are stripped with `normalize('NFD')` followed by removing non-letters (`Lucía` becomes `lucia`); a test checks every email is plain ASCII.
- **D16.** `seedDatabase` wraps all inserts in one transaction: all or nothing, and a single commit instead of 10k. Each repository insert nests inside as a savepoint. A 10k run takes about 1 s on a file DB.
- **D17.** `npm run seed` deletes and recreates the DB file (`DB_PATH`, default `backend/data/hr.db`), so every run produces the same data set. Settings: `SEED` (default 42), `COUNT` (default 10000).
- **D18.** The "<2 s for 10k" test is a generous budget, not a benchmark. It catches regressions like dropping the outer transaction without being flaky.

## Employee API (Chunk 2)

- **D19.** The API takes and returns salaries in **major units** (`85000.5`), which is what HR thinks in. The service converts to integer minor units with the currency's digits from `/shared` (`toMinorUnits`/`toMajorUnits`). An amount with more decimals than the currency allows (e.g. JPY `100.5`) gets a 400; it is never silently rounded.
- **D20.** Clients never send a currency. It's derived from `countryCode` (D7), so country and currency can't disagree.
- **D21.** `start_date` was added as **migration 2** with a backfill from the earliest salary history, rather than by editing migration 1. The column is nullable because SQLite can't add a `NOT NULL` column without a default; the API always requires it.
- **D22.** Sorting by salary uses the **USD equivalent** (a SQL `CASE` built from the static FX table), because raw minor units across currencies would rank any INR salary above any USD salary. Sorts always add `id` as a tie-breaker so pagination is stable.
- **D23.** `PUT` replaces the whole record. A change to the salary or currency appends history **effective today** (from an injected clock), in the same transaction as the update. Backdated or future-dated salary changes are out of scope.
- **D24.** Layering: routes parse with Zod and choose status codes; the service converts money and decides whether a salary changed; the repository holds all SQL and turns SQLite `UNIQUE` errors into `DuplicateEmailError`. Domain errors map to 400/404/409, and anything unexpected becomes a logged 500 with a generic body.
- **D25.** Errors share one shape, `{ error: { code, message, fields? } }`. `fields` maps a field name to readable messages ("Required" when a field is missing).
- **D26.** Pagination uses `LIMIT/OFFSET`: default page size 25, and a page size above 100 is rejected with a 400 rather than silently capped. Empty query values (`?search=`) mean no filter.
- **D27.** Search is a case-insensitive substring match on name or email, with `%` and `_` escaped. SQLite's `LIKE` only folds ASCII case, so `LUCÍA` won't match `Lucía`; that's acceptable for the MVP.
- **D28.** Emails are trimmed and lower-cased before they're stored.
- **D29.** `server.ts` seeds 10k employees (seed 42) when the database is empty, so hosts with ephemeral disks come back usable after a restart; existing data is never touched. Run it with `npm run dev:api` (`tsx watch`).
- **D30.** The backend serves `/employees` and `/health` at the root. The Vite dev proxy maps `/api/*` to them, so the frontend's own routes can't clash with API paths.
- **D31.** The production build (`tsc` emit) is deferred to the deployment step, because ESM output needs `.js` import extensions and `/shared` compiled.

## Insights API (Chunk 3)

- **D32.** One SQL statistics query (`salaryStatistics` in `insightsRepository`) computes headcount, min, max, mean, median and USD payroll for any grouping, so every endpoint aggregates the same way.
- **D33.** Median is computed in SQL with `ROW_NUMBER()` and `COUNT(*) OVER (PARTITION BY …)`, averaging the rows at positions `(n+1)/2` and `(n+2)/2`. That gives the middle row for odd n and the mean of the two middle rows for even n. Tested with odd, even, single and empty datasets.
- **D34.** Currencies are never mixed. `by-country` groups by country and currency and reports in local currency. `by-job-title` reports in USD across countries and in local currency with `?countryCode=`. Summary, distribution and outliers use USD. Every row states its `currencyCode`.
- **D35.** USD conversion happens per row in SQL (`SALARY_IN_USD`, shared with the salary sort). Rounding (cents, or the local currency's digits) happens once, in the service, after aggregating.
- **D36.** The distribution uses fixed 20,000 USD buckets `[min, max)`. Empty buckets between the lowest and highest are filled in so the histogram is continuous. Salaries are rounded to cents before bucketing so float noise can't push a value into the wrong bucket.
- **D37.** Outliers are employees paid above 1.5x or below 0.5x the median **for the same job title and country**, so they're compared like for like and an Indian salary is never flagged against US pay. Sorted by ratio, most overpaid first; page size up to 50.
- **D38.** Performance on 10k employees, real server and file DB: every insights endpoint answers in under 90 ms. Tests enforce under 500 ms per endpoint in memory. No extra indexes were needed, because full scans of 10k rows are cheap.
- **D39.** About 1% of seeded employees (decided by a seeded roll, so still deterministic) are paid far outside their band: half at 1.6–2.2x the band's top, half at 0.30–0.45x its bottom. Even the widest band (top = 2x bottom) then clears the outlier thresholds, so `/insights/outliers` has data to show. Everyone else is uniform within the band.

## Known issues

- `npm audit` reports 10 moderate advisories, all from one transitive `minimatch` version used by dev tooling. Nothing ships to production, so I'm not forcing an override.
