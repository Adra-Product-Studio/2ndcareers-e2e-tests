# 2nd Careers - E2E Test Suite

Playwright automation for the [2ndcareers-frontend](https://github.com/Adra-Product-Studio/2ndcareers-frontend) app.
This repo is checked out as a **git submodule** inside that app (at `e2e-tests/`), so it always
sits next to the app code it tests while keeping its own dependencies isolated.

## Structure

```
tests/
  professional/                    One continuous walkthrough of the professional role, one
                                    folder per page/section, numbered to run in that exact order
                                    (see "Why numbered files" below)
    01-login/01-login.spec.js         Sign-in page: empty/invalid/valid credentials, saves auth state
    02-navigation/01-nav-clicks.spec.js  Header nav links survive client-side transitions
    03-home/01-home.spec.js           Dashboard: data + every card/CTA
    04-jobs/                          All Jobs (complete flow: filter+search+paginate+save+apply),
                                      Recommended, Applied, Saved
    05-learning/                      Marketplace, see_all edge cases, internal event -> Book & Pay,
                                      external event -> Register
    06-agents/                        2C Agents hub, Career Copilots
    07-profile/                       Load+sections, then one file per editable section (About,
                                      Experience, Education, Skills, Preference, Languages,
                                      Additional Info, Social Links) - all working on the SAME
                                      already-loaded page, see below
    08-community/, 09-help/, 10-get_support/, 11-upgrade/   One page each; 11-upgrade also signs out
pages/
  LoginPage.js                     Page Object - the shared login form (all 4 roles use it)
  professional/
    shared/HeaderMenu.js           Shared header: notifications, top nav, profile dropdown, sign out
    home/, jobs/, learning/, agents/, profile/, community/, help/, get_support/, upgrade/
                                    One Page Object per page/section, mirroring tests/professional/
fixtures/
  credentials.js                   Reads per-role test accounts from env vars
support/
  apiEnvelope.js                   Shared response-envelope + response-capture helpers
  sharedPage.js                    One continuous browser window for the WHOLE suite - see below
scripts/
  report-to-pdf.js                 Renders the HTML report to PDF (used by CI, see below)
  merge-videos.js                  Locates the suite's one recorded video (used by CI, see below)
playwright.config.js               Base URL, headed/slow-mo switches, reporters
```

All four roles log in through the same form (`app/(routes)/(auth)/page.js` in the main repo) -
the server decides the role from the account. Only `professional/` is built out today; the same
pattern (a `pages/<role>/` folder + a numbered `tests/<role>/` folder) is meant to be repeated for
employer/partner/superadmin once real test accounts exist for them.

### Why numbered files, and what `support/sharedPage.js` does

The whole numbered suite (`01-login` through `11-upgrade`) shares **one continuous browser
window/page** - not one per file, and not one per test. Moving from one page/section to the next,
across files, is always a real click: a header nav link, a tab, a card, a profile-dropdown item -
the same way a person actually uses the site. `page.goto()` (a full reload) appears in only 3
places in the entire suite, each documented at its call site because there's no button anywhere in
the real app that reaches that state any other way: the very first login, and `08-community` /
`10-get_support` (both pages the app itself no longer links to from anywhere in the UI) - plus 2
tiny edge-case checks in `05-learning/02-see-all.spec.js` for a malformed URL a person could only
reach by typing it directly.

An earlier version of this suite gave every FILE its own fresh browser context (and its own
`page.goto()` to reach it) - technically reliable, but a headed/recorded run showed a jarring
white-screen "refresh" at every single file boundary, since each new context starts from a blank
page. Sharing one continuous page/context - and, within it, never reloading when a real click gets
you where you need to go (see `07-profile`: 8 files, one shared already-loaded page, zero
navigation between them) - is what actually matches how a person would use the app, and is what
the recorded video should look like too.

That's done with Playwright's own documented pattern for reusing a page across tests -
`test.describe.configure({ mode: "serial" })` plus `beforeAll` - wrapped in `support/sharedPage.js`'s
`useSharedPage(test)` helper, rather than a custom fixture that overrides Playwright's built-in
`page`/`context`. That distinction matters: an earlier version of this suite *did* override those
fixtures, and a real failing assertion in one test would silently leave the shared browser closed
for every test that ran after it, turning one bug into a wall of unrelated "Target page, context or
browser has been closed" failures. Serial mode's built-in behavior - skip the rest of *that file's*
tests after a failure - is the correct version of that and doesn't fight Playwright's own per-test
trace/screenshot handling. Because `useSharedPage` keeps the context alive across files via a
module-level singleton (created by whichever file runs first, closed explicitly by the last -
`closeSharedSession()`, called from `11-upgrade`), the files are **numbered to run in a specific,
uninterrupted order** (`fullyParallel: false`, `workers: 1`, and `retries: 0` in
`playwright.config.js` all enforce that - a retry would re-run a single file in a fresh worker with
none of the page state the files before it left behind, so a real failure is left to surface
clearly instead of retried into a confusing, differently-broken state). `01-login.spec.js` also
saves a Playwright `storageState` file (cookies) to `.auth/professional.json` (git-ignored - it's a
live session, never commit it) purely so a SINGLE file can still be run standalone during authoring
(e.g. `npx playwright test 07-profile`) - starting its own fresh, already-authenticated context
exactly like the old per-file model did, since there's no earlier file in that run to inherit a
live page from.

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
| `npm run test:e2e:headed` | Visible Chrome, maximized, actions slowed down so you can watch every click/type/redirect - one continuous window for the whole suite, see above |
| `npm run test:e2e:ui` | Playwright's interactive UI mode - step through each action, inspect the DOM before/after, time-travel through a run |
| `npm run test:e2e:debug` | Playwright Inspector - pause and step through line by line |
| `npm run test:e2e:report` | Open the last HTML report (traces, screenshots, videos for any failure) |

Run these from this folder, or from the parent app's repo root via its `npm run test:e2e*`
wrapper scripts (see the main repo's `package.json`).

A role with no test account configured still runs its page-load/validation/invalid-credential
steps in `01-login.spec.js` - every later file that needs to be logged in skips instead of
failing, and the report says why.

## Payments: what this suite does and does not do

`tests/professional/05-learning/03-internal-event.spec.js` clicks through Learning -> an event's
details -> Register -> Book & Pay, and checks the booking summary renders correctly. It
deliberately **stops one step before** clicking the confirm button, because for a paid listing
that button ("Confirm & Pay ₹<amount>") hits a real Razorpay checkout - see the comment in
`pages/professional/learning/InternalEventFlow.js`. Don't extend this flow to actually confirm/pay
without a designated sandbox/test payment method; doing so against a paid listing would attempt a
real charge. The external-event equivalent (`04-external-event.spec.js`) is safe to run
end-to-end for an *unpaid* event - it only ever opens `window.open(registration_link)`, no
internal payment call at all - but stops the same way short of a real Razorpay/Stripe session for
a paid one.

## CI: report + logic-diff PR comments

`.github/workflows/e2e-tests.yml` in the main repo:

- Checks out this repo as a plain `submodules: recursive` checkout - it works with GitHub's
  default `GITHUB_TOKEN` because this repo is **public**. (GitHub's default token can never see
  *another* repo, even a private one in the same org, so if this repo goes private again the
  submodule checkout needs a PAT instead - a fine-grained token scoped to read-only access on
  just this repo, added as an `E2E_REPO_PAT` secret on `2ndcareers-frontend`, with the checkout
  step rewriting the `github.com` git URL to use it. See this file's git history for that
  version of the workflow if you need to bring it back.)
- Runs this suite on every push, using `PLAYWRIGHT_BASE_URL` and the per-role
  `*_TEST_EMAIL` / `*_TEST_PASSWORD` GitHub Actions secrets.
- Converts the HTML report to a PDF (`npm run report:pdf`) and uploads it as a build artifact
  on every run.
- Uploads the suite's one continuous `.webm` recording (`e2e-automation-<sha>`) - the actual
  automation, watchable directly, rather than the raw trace.zip/screenshot.png/error-context.md
  bundle Playwright also writes to `test-results/`. See `support/sharedPage.js` for why recording
  has to be requested explicitly there instead of via `playwright.config.js`.
- On every push, a `logic-diff` job diffs `app/`, `components/`, `services/`, `store/`,
  `validate/`, and `utils/` against the previous commit on that branch (or the PR base, on a
  pull request) and renders the summary in the run's own Summary page - on a pull request it
  also posts/updates a PR comment, so a reviewer can confirm the old logic vs. the new logic
  before merging. Can also be triggered manually (Actions tab -> "Run workflow") with your own
  base/head refs.

## Adding new tests

- One `*.spec.js` per page/flow inside its own numbered folder under `tests/<role>/`, matching a
  same-named folder under `pages/<role>/` for that page's Page Object(s) (see "Structure" above).
  Number the folder/file to reflect where it sits in that role's walkthrough (see "Why numbered
  files" above).
- Arrive at the new page via a real click from wherever the previous file in the walkthrough
  ends (a header nav link, a tab, a card) - not a fresh `page.goto()`. Every Page Object's
  `goto()`/`waitForLoad()` accepts an optional `action` callback for exactly this; only reach for
  a plain `page.goto()` when there truly is no button anywhere in the app that gets there (and say
  so in a comment - see `08-community`/`10-get_support` for the pattern).
- Start every new spec file with `const session = useSharedPage(test);` inside its
  `test.describe(...)` block, then use `session.page` - don't request Playwright's own `page`
  fixture in these files, since that's exactly what `useSharedPage` deliberately avoids.
- Never hardcode real credentials or tokens in a spec - read them via `fixtures/credentials.js`
  (backed by env vars) so secrets stay out of git history.
