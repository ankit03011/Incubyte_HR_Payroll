# SQLite Schema (proposal, not implemented yet)

```sql
CREATE TABLE employees (
  id                  INTEGER PRIMARY KEY,
  full_name           TEXT    NOT NULL CHECK (length(trim(full_name)) > 0),
  email               TEXT    NOT NULL COLLATE NOCASE,
  job_title           TEXT    NOT NULL,
  department          TEXT    NOT NULL,
  country_code        TEXT    NOT NULL CHECK (length(country_code) = 2),   -- ISO 3166-1 alpha-2
  currency_code       TEXT    NOT NULL CHECK (length(currency_code) = 3),  -- ISO 4217
  salary_minor        INTEGER NOT NULL CHECK (salary_minor > 0),           -- current annual salary, minor units
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX ux_employees_email              ON employees (email);
CREATE INDEX        ix_employees_country_salary     ON employees (country_code, salary_minor);
CREATE INDEX        ix_employees_country_job_salary ON employees (country_code, job_title, salary_minor);
CREATE INDEX        ix_employees_full_name          ON employees (full_name COLLATE NOCASE);

CREATE TABLE salary_history (
  id              INTEGER PRIMARY KEY,
  employee_id     INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  salary_minor    INTEGER NOT NULL CHECK (salary_minor > 0),
  currency_code   TEXT    NOT NULL CHECK (length(currency_code) = 3),
  effective_from  TEXT    NOT NULL,          -- ISO date (YYYY-MM-DD)
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX ix_salary_history_employee_effective
  ON salary_history (employee_id, effective_from DESC);
```

`PRAGMA foreign_keys = ON` must be set on every connection, because SQLite doesn't enforce foreign keys by default.

## Reasoning

**Current salary is denormalised onto `employees`.** Every insight query (min / median / max per country) reads only `employees`, with no "latest row per employee" subquery over history. The cost is duplication: the service writes `employees.salary_minor` and a `salary_history` row **in one transaction**, so the two can't drift apart. A history row is written on create too, so the history is complete from day one.

**Money as `INTEGER` minor units.** SQLite has no decimal type, and `REAL` would introduce rounding errors in `SUM`. Integer sums are exact. Formatting happens at the edge.

**`currency_code` is stored even though it follows from country.** Each salary row describes itself completely: if an employee relocates, their old history rows keep the currency they were actually paid in. The service enforces that the currency matches the country (via the static map in `/shared`).

**Reference data (countries, currencies, FX rates) lives in `/shared` as typed constants, not tables.** It's static by assumption, needs no migrations, and the frontend reuses it for dropdowns. For org-wide payroll, SQL returns `SUM(salary_minor) GROUP BY currency_code` (about one row per currency), and the service converts that handful of rows to USD. Trade-off: changing a rate needs a deploy, which is acceptable for a static table.

**Indexes match the queries we know we'll run:**

| Index                                               | Serves                                                                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ux_employees_email` (unique, NOCASE)               | Enforces "no duplicate employee" in the DB, not just in app code. Also email lookup.                                                                 |
| `(country_code, salary_minor)`                      | Filter by country; per-country min/max are index seeks; median uses an ordered scan within one country without a sort step.                          |
| `(country_code, job_title, salary_minor)`           | The same statistics per job title within a country.                                                                                                  |
| `(full_name COLLATE NOCASE)`                        | Sorting the list by name, and prefix search (`LIKE 'ann%'`). A `%contains%` search can't use it, and at 10k rows a scan is still a few milliseconds. |
| `salary_history (employee_id, effective_from DESC)` | Showing one employee's history newest-first. Also gives the FK an index, so the cascade delete is fast.                                              |

**Median in SQL.** SQLite has no `MEDIAN()`. Use window functions: `ROW_NUMBER() OVER (PARTITION BY country_code ORDER BY salary_minor)` together with `COUNT(*) OVER (PARTITION BY country_code)`, then average the middle one or two rows. Everything stays in SQL, and the indexes above supply the ordering.

**Pagination: `LIMIT/OFFSET`.** At 10k rows the cost of a deep offset is negligible, and it supports "jump to page N" plus a total count, which an Excel user expects. Keyset pagination would scale better, but it complicates arbitrary sorting. Revisit beyond ~1M rows.

**Not indexed (YAGNI):** `department` and `job_title` on their own. Add them if profiling shows org-wide filters on those columns are slow.
