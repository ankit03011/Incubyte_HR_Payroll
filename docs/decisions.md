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
- **D30.** ~~The backend serves `/employees` at the root; Vite rewrites `/api/*`.~~ **Reversed by D73.**
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

## Frontend part 1 (Chunk 4)

- **D40.** Dependencies: Tailwind v4 and shadcn/ui (Nova preset). The CLI added `radix-ui`, `lucide-react`, `class-variance-authority`, `tw-animate-css`, the Geist font, and `cn` (shadcn's successor to `clsx` + `tailwind-merge`; verified as published by the shadcn maintainer, with no install scripts). Tests use RTL, `user-event`, `jest-dom` and `jsdom`.
- **D41.** TanStack Table is pinned to **v8**. npm's latest, v9, renamed its core API (`useTable`), and v8 is the version I can explain and debug on this deadline. Upgrading later is contained to one file.
- **D42.** ~~No router: two pages are a state switch in the app shell.~~ **Reversed by D58.**
- **D43.** There's no data-fetching library. `useAsync` (about 40 lines) aborts stale requests and derives `loading` from which request produced the stored result, so a slow old response can't overwrite a newer one. It keeps the last data while reloading, so the table doesn't flash empty between pages.
- **D44.** Filters and the country field use a styled native `<select>`: accessible, native on mobile and reliable in jsdom. Radix Select needs pointer APIs jsdom lacks.
- **D45.** The server is the only source of validation rules. The form submits what was typed (`noValidate`) and shows the 400 `fields` under each input via `aria-describedby`. A 409 becomes "An employee with this email already exists." on the email field.
- **D46.** The page number belongs to one view (search, filters, sort, page size). Any change derives page 1 instead of resetting it in an effect, so no request is ever sent for a stale page.
- **D47.** Search is debounced by 300 ms, so typing "ana" sends one request, not three.
- **D48.** Filter options come from the `/shared` reference lists, which match the seed. A job title or department typed free-hand in the form won't appear in the filter dropdowns (a `/meta` endpoint of distinct values would fix that).
- **D49.** Money is formatted with `Intl.NumberFormat('en-US')` in the employee's currency: whole amounts drop the decimals (`$120,000`), others show the currency's digits (`$85,000.50`). Dates are formatted in UTC so ISO dates don't shift a day.
- **D50.** Tests stub `fetch` (the network boundary) through `test/support/mockApi.ts`, which records requests so tests assert on the query that was sent, not on component internals.

## Insights dashboard (Chunk 5)

- **D51.** Each panel (summary, by country, by job title, distribution, outliers) fetches on its own with `useAsync` and renders its own loading, empty and error-with-retry state through a shared `Panel`, so one failing endpoint never blanks the page.
- **D52.** The summary uses hero numbers (stat cards), not charts: each answers one question at a glance. A missing average or median for an empty org shows "—", not `$0`.
- **D53.** The by-country and by-job-title panels are plain tables (`StatisticsTable`): small, fixed and already aggregated server-side, so TanStack Table would add nothing. Amounts are in each row's own `currencyCode`; payroll is in USD.
- **D54.** The distribution is a single-series Recharts column chart: one validated blue (`--chart-bar`, `#2a78d6` light and `#3987e5` dark, both passing the dataviz validator), no legend (the title names the series), columns at most 24 px with 4 px rounded tops, a recessive grid and a hover tooltip.
- **D55.** The chart has a "Show table" view, so the values are available without reading the chart (accessibility) and tests can check the data without SVG rendering, which jsdom can't do (`ResizeObserver` is stubbed in the test setup).
- **D56.** The outliers panel shows the salary in local currency plus the USD salary, peer median and ratio. Its page size is fixed at the API maximum of 50, using the shared `Pagination` with no size selector.
- **D57.** The dashboard is lazy-loaded, so Recharts isn't in the initial bundle. After Chunk 5.5: 149 kB gzipped initially (including the router), with 110 kB loaded the first time the dashboard is opened.

## UI overhaul (Chunk 5.5)

- **D58.** Added `react-router-dom` (approved), reversing D42: `/employees`, `/employees/:id`, `/insights`, a 404 page, and `/` redirecting to `/employees`. One `routes` table serves both `createBrowserRouter` (app) and `createMemoryRouter` (tests); each route's `handle.title` feeds the top bar's single `<h1>`.
- **D59.** The employee list's state lives in the URL (`search`, filters, `sortBy`/`sortOrder`, `page`, `pageSize`), so refresh, shared links and Back all work. Defaults are left out (a clean `/employees`), invalid hand-edited values fall back to defaults, and any change except paging returns to page 1.
- **D60.** Search updates the URL 300 ms after typing stops, with `replace`, so typing doesn't fill the history. Filters, sort and paging push history entries, so Back undoes them. When Back changes the URL, the search box follows it.
- **D61.** Employee detail is a page (`/employees/:id`), not a drawer: it's linkable and has room for history. Its "Back to employees" link returns to the same filtered list (the list's query string is passed in router state). Unknown or invalid ids show "Employee not found."
- **D62.** App shell: a left sidebar (icons and labels, collapsible to icons on desktop), a drawer opened from a hamburger below `md` (shadcn Sheet, no new dependency), and a sticky top bar with the page title and theme toggle. Navigation items come from one array, so future sections need one line.
- **D63.** Layout: a `max-w-7xl` content area with consistent padding. `min-w-0` on flex and grid children lets content shrink instead of widening the page; tables scroll inside their cards. Checked with real screenshots at 360, 1280 and 1920 px.
- **D64.** Dashboard: summary cards, then chart cards (salary distribution across the full width; payroll by country and median salary by job title side by side, stacked on small screens), then the detail tables and outliers. All charts reuse existing endpoints, so no backend change; the by-country response is fetched once and shared by its chart and table.
- **D65.** Chart cards have a fixed body height in every state (skeleton, empty, error, chart, table), so the grid never jumps and a chart can't overflow. Ranked bar charts are taller (`30rem`) to fit 16 one-line labels, truncated with the full name on hover.
- **D66.** Number formats: chart axes and the payroll headline are compact (`$723.6M`, `85K`), with the exact amount shown underneath; tables keep exact amounts.
- **D67.** Bar entry animation is off: charts render complete immediately, which also suits print, screenshots and reduced-motion users. Headless screenshots showed the animation leaving bars invisible.
- **D68.** Palette: neutral greys with one accent blue (`--primary`, `--ring`, active nav, chart bars) in both themes. Dark mode was nearly free: the shadcn tokens already existed, so it took a toggle, the system preference as the default, a remembered choice, and an inline script that applies it before first paint.
- **D69.** The employees table shows email under the name instead of in its own column, keeping the table within a laptop width with the row actions visible.

## List and table usability

- **D70.** The employee list defaults to **most recently added first** (new API sort `added`, by `id`: ids increase with every insert, while `created_at` has only second resolution and is identical for the 10k seeded rows). Column headers still sort by name, salary or start date.
- **D71.** After adding an employee, the list returns to the default view (no search or filters, page 1, newest first), so the new employee is always the first row even if they wouldn't match the previous filters. A **Reset** button appears whenever the view differs from the default.
- **D72.** Tables have a fixed-height scroll area with a sticky header instead of growing the page: the employees list fills the screen height minus the chrome (on `lg`+ the one-row toolbar leaves about 13.5rem to reserve; smaller screens reserve 17rem because the toolbar stacks), so pagination stays visible at the bottom; dashboard tables cap at 28rem and the detail page's salary history at 24rem. The header's divider is an inset shadow, because collapsed borders scroll away under a sticky header.

## Production readiness (Chunk 6)

- **D73.** The API lives under `/api` in every environment (reverses D30): one URL scheme for dev (Vite forwards `/api` unchanged) and production (same-origin, no CORS). Unknown `/api/*` paths return a JSON 404, never `index.html`.
- **D74.** In production Express serves the built frontend: hashed `/assets/*` are cached for a year (`immutable`), `index.html` is `no-cache`, and any GET without a file extension falls back to `index.html`, so `/insights` survives a refresh. A missing asset is a real 404, never HTML that a script tag would choke on.
- **D75.** The production build uses `tsc` emit (as decided in D9). Backend and shared use `NodeNext` resolution with `.js` import extensions, so the output runs on plain Node. `@hr/shared` is built to `dist`; its `exports` map points `types` and `development` at the TS source (Vite, Vitest, `tsx --conditions=development`) and `default` at `dist` (Node in production, `vite build`). Dev needs no build step; `npm run build` builds shared → backend → frontend.
- **D76.** Configuration is a pure `loadConfig(env)` validated with Zod: `PORT` (3000), `DB_PATH` (`backend/data/hr.db`), `SEED` (42), `COUNT` (10,000), `STATIC_DIR`. Defaults are relative to the backend package, not the current directory; invalid values stop startup with a message naming the variable. The UI is served whenever a built `index.html` exists, so `npm start` needs no `NODE_ENV`.
- **D77.** Seed on startup only when the database is empty (D29). On a free host the SQLite file is **ephemeral**: every restart or redeploy starts empty and re-seeds the same deterministic 10k employees in about 1 s, and any edits made through the UI are lost. That's acceptable for a demo, because the data is reproducible.
- **D78.** In real production I'd move to **managed Postgres** (e.g. Render, Neon or RDS): durable storage, backups and point-in-time recovery, concurrent writers, and room for multiple app instances. The SQL is standard apart from the window functions (which Postgres supports, and which could use `percentile_cont` for the median), and all SQL is in two repositories, so the change is contained. I'd add versioned migrations with a tool, stop seeding production, and add auth (out of scope, see requirements).
- **D79.** The Docker image is multi-stage on `node:22-slim`: the build stage has the native toolchain for `better-sqlite3`, builds, then prunes dev dependencies; the runtime stage copies only the compiled output and production `node_modules`, runs as the non-root `node` user, and has a `/api/health` health check. Trade-off: frontend runtime packages (React and so on) stay in `node_modules` because pruning is workspace-wide (a larger image, no functional effect). Not verified here (no Docker locally).
- **D80.** For Render I recommend its native Node runtime (`npm ci && npm run build`, then `npm start`, health check `/api/health`) over Docker, because it's exactly what was smoke-tested locally. Node 22 is pinned via `engines`.

## Known issues

- `npm audit` reports 10 moderate advisories, all from one transitive `minimatch` version used by dev tooling. Nothing ships to production, so I'm not forcing an override.
