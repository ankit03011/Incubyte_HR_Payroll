# HR Payroll: employee salary management

A web app for an HR manager who today manages salaries for **10,000 employees across 10 countries** in Excel. It keeps employee and salary data in one place, records every salary change, and answers **"how do we pay people?"** with salary statistics by country and job title, a salary distribution, and a list of outliers.

- **Employees:** search, filter (country, department, job title), sort and page through 10k people on the server. Add, edit and delete them; open one for their salary history. The list state lives in the URL, so links, refresh and Back work.
- **Dashboard:** headcount, payroll, and average and median salary; salary distribution; payroll by country; median salary by job title; detail tables; and pay outliers (above 1.5x or below 0.5x the median for the same job title in the same country).
- **Money done right:** salaries are stored as integer minor units in the employee's local currency. Statistics never mix currencies; anything compared across countries is converted to USD with a static FX table.

## Run it locally

Requires **Node 22+** and npm 10+.

```bash
npm install
npm run dev:api     # terminal 1: API on http://localhost:3000 (seeds 10k employees on first start)
npm run dev:web     # terminal 2: UI on http://localhost:5173 (proxies /api to :3000)
```

| Command                                                       | What it does                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm test`                                                    | All tests (backend, shared, frontend)                                                |
| `npm run seed`                                                | Reset the local DB to the deterministic 10k data set (`SEED`, `COUNT` override)      |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | Static checks                                                                        |
| `npm run build`                                               | Production build: `shared` and `backend` with `tsc`, `frontend` with Vite            |
| `npm start`                                                   | Run the production build: one server for the UI and the API on http://localhost:3000 |

### Configuration (environment variables)

| Variable         | Default              | Purpose                                              |
| ---------------- | -------------------- | ---------------------------------------------------- |
| `PORT`           | `3000`               | HTTP port                                            |
| `DB_PATH`        | `backend/data/hr.db` | SQLite file (created if missing)                     |
| `SEED` / `COUNT` | `42` / `10000`       | Deterministic demo data written when the DB is empty |
| `STATIC_DIR`     | `frontend/dist`      | Built UI to serve (served only if it exists)         |

Invalid values stop the server at startup with a message naming the variable.

### Docker

```bash
docker build -t hr-payroll .
docker run -p 3000:3000 hr-payroll
```

## Architecture

```
 Browser (React SPA: routes, TanStack Table, Recharts)
   │  fetch /api/*                      ▲  static files + index.html fallback
   ▼                                    │
 ┌──────────────────── Express (one Node process) ────────────────────┐
 │  /api/employees, /api/insights        everything else → frontend/  │
 │        │                                                          │
 │  routes        Zod validation, HTTP status codes                  │
 │    ▼                                                              │
 │  services      money conversion, business rules, domain errors    │
 │    ▼                                                              │
 │  repositories  ALL the SQL: CRUD, filters, window-function median │
 └───────┬────────────────────────────────────────────────────────────┘
         ▼
     SQLite (better-sqlite3): employees + salary_history

 shared/: API types, reference data (countries, currencies, FX, salary bands),
          money helpers, used by both backend and frontend
```

- **`backend/`**: Express 5 + TypeScript (strict, no `any`), better-sqlite3, Zod. `createApp({ db })` is a factory, so tests inject an in-memory DB with no mocks.
- **`frontend/`**: React 19 + Vite, shadcn/ui on Tailwind, TanStack Table, Recharts, React Router. The dashboard page is lazy-loaded.
- **`shared/`**: a workspace package. Dev tools read its TypeScript source; production Node reads the compiled `dist`.
- **Tests:** Vitest everywhere. Supertest against an in-memory SQLite for the API; React Testing Library with `fetch` stubbed at the network boundary for the UI.

## Key decisions and trade-offs

Every decision is recorded in [`docs/decisions.md`](docs/decisions.md), one line each with its trade-off. The ones that matter most:

- **Integer minor units, currency per country.** Exact sums, and no rounding drift. JPY has no minor unit, so yen are stored as is.
- **Current salary copied onto `employees`, history in `salary_history`,** both written in one transaction. Statistics read one table, and history can't drift from it.
- **Aggregation in SQL.** The median uses `ROW_NUMBER()`/`COUNT() OVER (PARTITION BY …)`, and USD conversion is a SQL `CASE` built from the static FX table. Every dashboard endpoint answers in under 100 ms on 10k rows.
- **Validation split:** format rules in Zod (field-level messages), integrity in the DB (foreign keys, unique email, salary above 0). Trade-off: direct DB writes skip the format rules.
- **The server is the only source of validation;** the form shows the 400 field errors it returns.
- **SQLite with deterministic seed-on-empty.** That's simple and is the right size for a demo. On free hosts the disk is ephemeral, so data resets on restart (see Deployment). In production I'd move to managed Postgres (D78).
- **List state in the URL,** newest-first by default, and fixed-height tables with sticky headers.

## Out of scope (by design) and future improvements

These were deliberately left out; the reasons are in [`docs/requirements.md`](docs/requirements.md):

- authentication and roles
- payroll runs and tax
- live FX rates
- approval workflows
- bonuses and equity
- a full audit trail

Next steps I'd take:

- **Postgres** with managed backups, and a migration tool.
- **Auth** with an `HR admin` role, which also gives a "who changed what" trail.
- **Backdated and future-dated salary changes,** plus an effective-date history view.
- **Soft delete / termination dates** instead of hard delete.
- **CSV import and export.** An HR team coming from Excel will ask for it on day one.
- **A `/api/meta` endpoint** so filter dropdowns list the departments and job titles that actually exist.
- **Playwright end-to-end tests and visual regression checks.** Layout bugs in this project were caught only by screenshots.

## Deployment (Render)

Use Render's native Node runtime. It's exactly what was smoke-tested locally.

| Setting           | Value                     |
| ----------------- | ------------------------- |
| Build command     | `npm ci && npm run build` |
| Start command     | `npm start`               |
| Health check path | `/api/health`             |

Render sets `PORT` itself. The Dockerfile is a ready alternative. On the free plan the instance sleeps when idle, and the SQLite file resets on every restart or redeploy; it re-seeds the same 10k employees in about a second.

## How AI was used

I built this with an AI pair programmer, under rules I set (TDD, small commits, ask before adding dependencies) and with every product decision mine. What it did, which decisions were mine, and every mistake it made and how it was caught are in [`docs/ai/`](docs/ai/README.md).
