# How AI was used

I built this with an AI pair programmer (Claude Code) inside my editor. I set the stack, the working rules and every product decision; the AI proposed designs, wrote tests and code in small steps, and explained trade-offs. I reviewed each step and made every commit myself.

## Working rules I gave it

- **TDD:** a failing test first, shown failing, then the minimum code to pass, then refactor. Later sped up to "all tests for a chunk first, then implement", but still red before green.
- **Small steps,** with a suggested conventional commit after each, so `test:` (red) and `feat:` (green) commits stay separate.
- **Layering:** routes → services → repositories, all SQL in repositories, and aggregation in SQL or the service, never in the browser.
- **No `any`.** Ask before adding any dependency. Record decisions and trade-offs in [`decisions.md`](../decisions.md).
- **Report its own mistakes** so I could log them here.

## Decisions I made (not the AI)

- Salary paid in the country's currency; money as integer minor units; unique email; hard delete with the trade-off recorded (D7, D8).
- A static FX table instead of the AI's first suggestion (per-currency stats with no conversion).
- Email and department added to the employee model.
- Format validation in Zod, integrity rules in the DB, with the trade-off recorded (D10).
- Commit granularity and the faster per-chunk TDD mode.
- Approving each new dependency: ESLint extras, `tsx`, Tailwind/shadcn, Recharts, `react-router-dom`.
- UI feedback after using the app: newest employees first, fixed-height tables, less empty space below the table.

## Mistakes the AI made, and how they were caught

| What happened                                                                                                     | How it was caught / fixed                                            |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Claimed SQLite doesn't enforce foreign keys by default; better-sqlite3 does                                       | A test passed without new code. Docs corrected, pragma kept explicit |
| Put two behaviours in one red step                                                                                | Self-reported; kept, as the same rule on two tables                  |
| Left dead code (`void offset`, an unused `meta` prop, `request<void>`)                                            | Self-review and lint                                                 |
| A red test failing for the wrong reason ("module not found")                                                      | Reworked so the test failed on the real behaviour first              |
| Wrote a malformed-JSON → 400 branch without a test                                                                | Test added; proved by deleting the branch (test went 500)            |
| Missing fields returned Zod's raw "expected string, received undefined"                                           | Manual smoke test, then a red test and a fix                         |
| A timing claim in the docs that was never measured                                                                | Removed                                                              |
| A corrupted accent-stripping regex in the seed; nothing tested it, and the line turned out to be redundant        | Investigated, line removed, ASCII-email test added and proved        |
| Salary and start-date columns couldn't sort (TanStack needs an accessor)                                          | Caught by the sort test                                              |
| Tests that passed without checking anything after routing moved the `<h1>` into the shell                         | Noticed and fixed: tests wait for real page content                  |
| An intermittent URL test (React Router transitions)                                                               | Diagnosed with a trace; the test now waits for each request          |
| Pagination showed the server's echoed page size, not the URL's                                                    | Caught by the URL-restore test                                       |
| Chart bars invisible (entry animation), overlapping axis labels, row actions off-screen                           | Only found by taking real screenshots; all fixed                     |
| Trusted 360 px headless screenshots that were really 496 px wide                                                  | Measured the viewport, then used a true-width iframe                 |
| Started work without checking `git status`, mixing two uncommitted chunks                                         | Committed together; now checks `git status` before each chunk        |
| Stopped processes by port during cleanup, possibly my own dev server                                              | Now uses its own ports and stops only the PIDs it started            |
| Reserved too much height under the employees table                                                                | I spotted it in the UI; the reserve was recalculated for desktop     |
| Added `@types/*` without asking; small shell slips (`npm -w .`, a hidden failed install, PowerShell 7-only flags) | Self-reported and corrected                                          |

## What I'd keep doing

- **Red first, every time.** Several bugs were caught only because a test was written before the code.
- **Look at the running app.** Tests and types missed every layout and chart problem above.
- **Make the AI state assumptions and trade-offs,** and record the ones I accept.
