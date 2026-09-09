# 2nd Careers - E2E Test Suite

Playwright automation for the [2ndcareers-frontend](https://github.com/AdraProductStudio/2ndcareers-frontend) app.
This repo is checked out as a **git submodule** inside that app (at `e2e-tests/`), so it always
sits next to the app code it tests while keeping its own dependencies isolated.

## Structure

```
tests/
  auth/
    login.shared.js            Shared login flow (page load, validation, wrong creds, real login + redirect)
    professional-login.spec.js Registers the shared flow for the professional role
    employer-login.spec.js     Registers the shared flow for the employer role
    partner-login.spec.js      Registers the shared flow for the partner role
    superadmin-login.spec.js   Registers the shared flow for the superadmin role
pages/
  LoginPage.js                 Page Object Model - selectors + actions for the login page
fixtures/
  credentials.js               Reads per-role test accounts from env vars
scripts/
  report-to-pdf.js             Renders the HTML report to PDF (used by CI, see below)
playwright.config.js           Base URL, headed/slow-mo switches, reporters
```

All four roles log in through the same form (`app/(routes)/(auth)/page.js` in the main repo) -
the server decides the role from the account, so the flow is shared and only the expected
redirect differs per role.

## Setup

```bash
npm install
npx playwright install --with-deps chromium
cp .env.test.example .env.test
# edit .env.test -> set PLAYWRIGHT_BASE_URL (staging/QA URL) and at least one role's
# TEST_EMAIL / TEST_PASSWORD
```

## Running - and watching it happen live

| Command | What it does |
|---|---|
| `npm run test:e2e` | Headless run in Chromium (fast, no visible browser) |
| `npm run test:e2e:headed` | Visible Chrome, maximized, actions slowed down (500ms) so you can watch every click/type/redirect |
| `npm run test:e2e:ui` | Playwright's interactive UI mode - step through each action, inspect the DOM before/after, time-travel through a run |
| `npm run test:e2e:debug` | Playwright Inspector - pause and step through line by line |
| `npm run test:e2e:report` | Open the last HTML report (traces, screenshots, videos for any failure) |

Run these from this folder, or from the parent app's repo root via its `npm run test:e2e*`
wrapper scripts (see the main repo's `package.json`).

A role with no test account configured still runs its page-load/validation/invalid-credential
steps - only the final "logs in successfully" step is skipped for that role, and the report
says why.

## CI: report + logic-diff PR comments

`.github/workflows/e2e-tests.yml` in the main repo:

- Runs this suite on every push, using `PLAYWRIGHT_BASE_URL` and the per-role
  `*_TEST_EMAIL` / `*_TEST_PASSWORD` GitHub Actions secrets.
- Converts the HTML report to a PDF (`npm run report:pdf`) and uploads it as a build artifact
  on every run.
- On pull requests, a separate job diffs `app/`, `components/`, `services/`, `store/`,
  `validate/`, and `utils/` against the PR base and posts a comment showing which pages are
  new and, for modified files, a diff of what changed - so a reviewer can confirm the old
  logic vs. the new logic before merging.

## Adding new tests

- One `*.spec.js` per page/flow inside `tests/<area>/`.
- One Page Object per page inside `pages/`, reused across specs.
- Never hardcode real credentials or tokens in a spec - read them via `fixtures/credentials.js`
  (backed by env vars) so secrets stay out of git history.
