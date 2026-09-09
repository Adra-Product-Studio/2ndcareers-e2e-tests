# 2nd Careers - E2E Test Suite

Playwright automation for the [2ndcareers-frontend](https://github.com/AdraProductStudio/2ndcareers-frontend) app.
This repo is checked out as a **git submodule** inside that app (at `e2e-tests/`), so it always
sits next to the app code it tests while keeping its own dependencies isolated.

## Structure

```
tests/
  professional/                    One continuous walkthrough of the professional role, numbered
                                    to run in that exact order (see "Why numbered files" below)
    01-login.spec.js                Sign-in page: empty/invalid/valid credentials, saves auth state
    02-home.spec.js                 Dashboard: data + every card/CTA
    03-jobs.spec.js                 Job listings: data + tabs/search/filter
    04-learning.spec.js             Learning listings: data
    05-agents.spec.js               2C Agents landing: data + both agent cards
    06-community.spec.js            Community landing: data + Join CTA
    07-profile-menu.spec.js         Profile dropdown: My Profile / Upgrade / Help / Get Support
    08-learning-book-and-pay.spec.js  Learning -> event details -> Book & Pay (stops before paying)
    09-logout.spec.js               Sign out, back to the login page
pages/
  LoginPage.js                     Page Object - the shared login form (all 4 roles use it)
  professional/
    HeaderMenu.js                  Shared header: notifications, top nav, profile dropdown, sign out
    HomePage.js, JobsPage.js, LearningPage.js, AgentsPage.js, CommunityPage.js
    ProfilePage.js, UpgradePage.js, HelpPage.js
    LearningEventFlow.js           Event details -> Book & Pay (see payment note below)
fixtures/
  credentials.js                   Reads per-role test accounts from env vars
support/
  apiEnvelope.js                   Shared response-envelope + response-capture helpers
  sharedPage.js                    One browser window per spec file - see below
scripts/
  report-to-pdf.js                 Renders the HTML report to PDF (used by CI, see below)
playwright.config.js               Base URL, headed/slow-mo switches, reporters
```

All four roles log in through the same form (`app/(routes)/(auth)/page.js` in the main repo) -
the server decides the role from the account. Only `professional/` is built out today; the same
pattern (a `pages/<role>/` folder + a numbered `tests/<role>/` folder) is meant to be repeated for
employer/partner/superadmin once real test accounts exist for them.

### Why numbered files, and what `support/sharedPage.js` does

Watching a headed run reopen a brand-new browser window for every single check made it hard to
follow, so this suite instead opens **one browser window per file** (not per test): the tests
inside `01-login.spec.js` share one page, `02-home.spec.js` shares a separate one, and so on.

That's done with Playwright's own documented pattern for reusing a page across a file's tests -
`test.describe.configure({ mode: "serial" })` plus `beforeAll`/`afterAll` - wrapped in
`support/sharedPage.js`'s `useSharedPage(test)` helper, rather than a custom fixture that
overrides Playwright's built-in `page`/`context`. That distinction matters: an earlier version of
this suite *did* override those fixtures, and a real failing assertion in one test would silently
leave the shared browser closed for every test that ran after it, turning one bug into a wall of
unrelated "Target page, context or browser has been closed" failures. Serial mode's built-in
behavior - skip the rest of *that file's* tests after a failure - is the correct version of that
and doesn't fight Playwright's own per-test trace/screenshot/video handling.

Because each file's window is independent, the files are **numbered to run in a specific order**
(`fullyParallel: false` + `workers: 1` in `playwright.config.js` enforce that): `01-login.spec.js`
logs in and saves a Playwright `storageState` file (cookies) to `.auth/professional.json`
(git-ignored - it's a live session, never commit it); every later file's `beforeAll` loads that
same file via `useSharedPage(test)`, so it starts already authenticated instead of re-doing the
login UI. If that file doesn't exist yet (tests run out of order, or no credentials were
configured), a file falls back to a logged-out context and fails with a clear "not logged in"
error rather than crashing on a missing file.

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
| `npm run test:e2e:headed` | Visible Chrome, maximized, actions slowed down (500ms) so you can watch every click/type/redirect - one window per file, see above |
| `npm run test:e2e:ui` | Playwright's interactive UI mode - step through each action, inspect the DOM before/after, time-travel through a run |
| `npm run test:e2e:debug` | Playwright Inspector - pause and step through line by line |
| `npm run test:e2e:report` | Open the last HTML report (traces, screenshots, videos for any failure) |

Run these from this folder, or from the parent app's repo root via its `npm run test:e2e*`
wrapper scripts (see the main repo's `package.json`).

A role with no test account configured still runs its page-load/validation/invalid-credential
steps in `01-login.spec.js` - every later file that needs to be logged in skips instead of
failing, and the report says why.

## Payments: what this suite does and does not do

`08-learning-book-and-pay.spec.js` clicks through Learning -> an event's details -> Register ->
Book & Pay, and checks the booking summary renders correctly. It deliberately **stops one step
before** clicking the confirm button, because for a paid listing that button ("Confirm & Pay
₹<amount>") hits a real Razorpay checkout - see the comment in
`pages/professional/LearningEventFlow.js`. Don't extend this flow to actually confirm/pay without
a designated sandbox/test payment method; doing so against a paid listing would attempt a real
charge.

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

- One `*.spec.js` per page/flow inside `tests/<role>/`, numbered to reflect where it sits in that
  role's walkthrough (see "Why numbered files" above).
- One Page Object per page inside `pages/<role>/`, reused across specs.
- Start every new spec file with `const session = useSharedPage(test);` inside its
  `test.describe(...)` block, then use `session.page` - don't request Playwright's own `page`
  fixture in these files, since that's exactly what `useSharedPage` deliberately avoids.
- Never hardcode real credentials or tokens in a spec - read them via `fixtures/credentials.js`
  (backed by env vars) so secrets stay out of git history.
