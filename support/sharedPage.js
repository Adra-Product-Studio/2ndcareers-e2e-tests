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
 *
 * Pass `videoName` (e.g. "01-login") to record this file's whole run as one .webm - one
 * continuous video per file, matching the one-window-per-file model above. This can't be done
 * via playwright.config.js's `use.video` option: that only applies to contexts Playwright's own
 * `context`/`page` fixtures create, and this deliberately creates its own instead (see above) -
 * so recording has to be requested directly on this newContext() call.
 */
function useSharedPage(test, { authenticated = true, videoName = "session" } = {}) {
  test.describe.configure({ mode: "serial" });

  const session = { page: null, context: null };

  test.beforeAll(async ({ browser }) => {
    // Falls back to a logged-out context if 01-login.spec.js hasn't run yet (or skipped saving
    // state because no credentials were configured) - tests here then fail with clear
    // "not logged in" errors instead of a confusing ENOENT reading a storageState that doesn't exist.
    const useAuth = authenticated && fs.existsSync(AUTH_FILE);
    session.context = await browser.newContext({
      ...(useAuth ? { storageState: AUTH_FILE } : {}),
      recordVideo: { dir: path.join(__dirname, "..", "test-results", "videos", videoName) },
    });
    session.page = await session.context.newPage();
  });

  test.afterAll(async () => {
    // Closing the context (not just the page) is what finalizes and writes the video file.
    await session.context.close();
  });

  return session;
}

module.exports = { useSharedPage, AUTH_FILE };
