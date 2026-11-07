# Requirements: Employee Salary Management

## Goal

Replace the HR Manager's Excel workbook with a web app that keeps employee and salary data in one consistent place and answers **"how do we pay people?"** across an organisation of ~10,000 employees in multiple countries.

## Persona

**The HR Manager.** Comfortable with spreadsheets, not technical. Today they sort, filter and pivot in Excel to answer questions like "what's the median salary for engineers in India?" They need:

- Fast lookup and editing of individual employees
- Trustworthy aggregate numbers without building pivot tables by hand
- Confidence that a salary change doesn't silently overwrite what was paid before

## Scope (MVP)

1. **Employee management:** create, view, edit and delete employees (name, email, job title, department, country, salary).
2. **Employee list:** server-side paginated, sortable, and filterable by country, job title and department, with name/email search. It has to stay fast at 10k+ rows.
3. **Salary updates with history:** changing a salary records the previous value and its effective date, so HR can see how pay changed.
4. **Salary insights by country:** headcount, min / median / mean / max salary, and total payroll in local currency.
5. **Salary insights by job title within a country:** the same statistics, so HR can compare like with like.
6. **Org-wide payroll:** total payroll converted to one reporting currency (USD) using a static FX table.
7. **Seed data:** a script that generates ~10,000 realistic employees, so performance and insights can be demonstrated.

All aggregation runs in SQL or the service layer, never in the browser.

## Deliberately out of scope

| Excluded                           | Reasoning                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Authentication / authorisation** | The persona is a single HR user. Auth is a cross-cutting concern that can be added later (middleware) without changing the domain. Building it now spends the time budget on non-differentiating work. |
| **Payroll run / tax / deductions** | Country-specific tax rules are a product in themselves. The app answers "what do we pay", not "how do we process payslips".                                                                            |
| **Live FX rates**                  | Needs an external API, caching, failure handling and historical rates. A static table keeps insights deterministic and testable; rates are clearly labelled as indicative.                             |
| **Approval workflows**             | Multi-actor state machines need roles (and therefore auth). With a single HR user, an approval step adds friction without value.                                                                       |
| **Bonuses, equity, allowances**    | Variable compensation has its own lifecycle (grants, vesting, targets). Base salary is the core of "how do we pay people"; the model can be extended with compensation components later.               |
| **Full audit trail**               | Who-changed-what-and-when for every field needs actor identity (auth) and event storage. Only salary changes are historised, because that's the question HR actually asks.                             |

## Key assumptions

- **One current salary per employee.** Annual gross base salary. Earlier values live in salary history.
- **Salary is paid in the currency of the employee's country.** Each country maps to exactly one currency, which makes per-country statistics meaningful without conversion.
- **Money is stored as integer minor units** (e.g. cents) to avoid floating-point rounding errors.
- **Static FX table** (rate to USD) is versioned in code and used only for the org-wide reporting total.
- **Single HR user.** No concurrent-edit conflict handling beyond what SQLite provides.
- **Email is unique** and acts as the natural identifier HR uses to spot duplicates.
- **Deleting an employee is a hard delete** that also removes their salary history. Soft delete or termination dates are a future enhancement.
