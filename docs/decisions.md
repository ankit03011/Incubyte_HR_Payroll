# Decisions & Trade-offs

## D1. Strict TypeScript, shared base config

- **Decision:** A root `tsconfig.base.json` with `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `verbatimModuleSyntax`. Each workspace extends it. ESM with `moduleResolution: "Bundler"`, and `tsc` is used only for type-checking (`noEmit`).
- **Why:** The extra strict flags catch unchecked index access and `undefined` vs. missing-property bugs, which matter for request parsing and SQL row mapping. One base config keeps all three packages equally strict.
- **Trade-off:** There is no compiled `dist` yet, so running the server needs a TS runner or build step (see Open questions).

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
- **Why:** No dependency before there's a use for it. shadcn/ui also needs Tailwind, which needs approval (see Open questions).

## D6. Schema

See [schema.md](schema.md). In short: current salary is denormalised onto `employees` for fast aggregation, history goes in `salary_history` (both written in one transaction), money is stored as integer minor units, and reference/FX data lives in `/shared` constants.

## Known issues

- `npm audit` reports 10 moderate advisories, all from one transitive `minimatch` version used by dev tooling. Nothing ships to production, so I'm not forcing an override.

## Open questions

- **Dev server runner:** `tsx` (dev dependency) vs. a `tsc` build. Needed once `src/server.ts` exists.
- **Tailwind CSS:** required by shadcn/ui; needs approval.
