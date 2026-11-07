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

## Known issues

- `npm audit` reports 10 moderate advisories, all from one transitive `minimatch` version used by dev tooling. Nothing ships to production, so I'm not forcing an override.
