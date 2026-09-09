// @ts-check
const fs = require("fs");
const path = require("path");

const AUTH_FILE = path.join(__dirname, "..", ".auth", "professional.json");

/**
 * Sets up ONE browser context/page for every test in the calling spec file - the officially
 * documented Playwright pattern for reusing a single page across tests (test.describe.configure
 * "serial" + beforeAll/afterAll: https://playwright.dev/docs/test-fixtures#combining-custom-fixtures-from-multiple-modules),
 * rather than a custom worker-scoped fixture overriding Playwright's own `page`/`context`.
 *
 * That matters beyond style: Playwright's per-test screenshot/trace/video capture is wired to
 * its own `page`/`context` fixtures, and a worker-scoped override fights that - a failing
 * assertion anywhere was observed to leave the *shared* browser/context closed for every test
 * that ran after it in the file, turning one real bug into a wall of unrelated "Target page,
 * context or browser has been closed" failures. Serial mode's built-in behavior instead - skip
 * the rest of this file's tests after a failure - is the correct, explicit version of that.
 *
 * One browser window opens per FILE (not per individual test/check) - tests/professional/ is
 * numbered 01-09 so a headed run still reads as one continuous walkthrough per page.
 *
 * Pass `authenticated: true` (default) to start already logged in via the storageState that
 * 01-login.spec.js saves after a successful login. Pass `authenticated: false` for that file
 * itself, which needs a clean, logged-out context.
 */
function useSharedPage(test, { authenticated = true } = {}) {
  test.describe.configure({ mode: "serial" });

  const session = { page: null };

  test.beforeAll(async ({ browser }) => {
    // Falls back to a logged-out context if 01-login.spec.js hasn't run yet (or skipped saving
    // state because no credentials were configured) - tests here then fail with clear
    // "not logged in" errors instead of a confusing ENOENT reading a storageState that doesn't exist.
    const useAuth = authenticated && fs.existsSync(AUTH_FILE);
    const context = await browser.newContext(useAuth ? { storageState: AUTH_FILE } : {});
    session.page = await context.newPage();
  });

  test.afterAll(async () => {
    await session.page.close();
  });

  return session;
}

module.exports = { useSharedPage, AUTH_FILE };
