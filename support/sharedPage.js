// @ts-check
const fs = require("fs");
const path = require("path");

const AUTH_FILE = path.join(__dirname, "..", ".auth", "professional.json");
const VIDEO_DIR = path.join(__dirname, "..", "test-results", "videos", "professional-suite");

// Module-level singleton: the whole numbered suite (01-login .. 11-upgrade) shares ONE browser
// context/page/video, created by whichever file runs first and closed explicitly by the last
// file (see closeSharedSession() below, called from 11-upgrade). Playwright runs this suite with
// fullyParallel:false/workers:1 (playwright.config.js), so every file executes in the same worker
// process in numbered order - a plain module-level variable survives across files exactly like it
// would across describe blocks in one file.
//
// This replaces the earlier one-context-per-FILE design. That design gave each file its own
// video, concatenated afterwards by scripts/merge-videos.js - but every file boundary meant a
// brand new browser context starting from a blank page, which always needs one real
// page.goto()/full reload to reach that file's page again. Concatenated back to back, each of
// those reads as a jarring white-screen "refresh" in the merged video, once per file (20+ times
// across the suite) - exactly what was reported. A single continuous context/page/video means the
// suite only ever navigates for real reasons (the initial login redirect, and the one page with
// no in-app click path to it - see 08-community) - everywhere else, moving to "another page" is a
// real nav-link/tab/card click carried out on the SAME page instance, same as a person clicking
// around the site, with nothing to concatenate afterward.
let sharedContext = null;
let sharedPage = null;

/**
 * Pass `authenticated: true` (default) to start already logged in via the storageState that
 * 01-login.spec.js saves after a successful login - only actually consulted the first time this
 * creates the shared context (every later call just reuses the existing one), so 01-login itself
 * still opts out with `authenticated: false` to get a clean, logged-out context when it's the one
 * creating it.
 *
 * A file can still be run in isolation (e.g. `npx playwright test 07-profile`) - it becomes the
 * "first" file for that run and creates its own fresh context from storageState exactly as
 * before, so single-file runs during authoring/debugging keep working unchanged.
 */
function useSharedPage(test, { authenticated = true } = {}) {
  test.describe.configure({ mode: "serial" });

  const session = { page: null, context: null };

  test.beforeAll(async ({ browser }) => {
    if (!sharedContext) {
      const useAuth = authenticated && fs.existsSync(AUTH_FILE);
      sharedContext = await browser.newContext({
        ...(useAuth ? { storageState: AUTH_FILE } : {}),
        // Bigger than the default test viewport so the recording reads clearly at normal
        // playback size instead of an upscaled/blurry 1280x720 capture.
        recordVideo: { dir: VIDEO_DIR, size: { width: 1600, height: 900 } },
      });
      sharedPage = await sharedContext.newPage();
    }
    session.context = sharedContext;
    session.page = sharedPage;
  });

  return session;
}

/** Call once, from the last file in run order (11-upgrade), to finalize the one video file. */
async function closeSharedSession() {
  if (sharedContext) {
    await sharedContext.close();
    sharedContext = null;
    sharedPage = null;
  }
}

/**
 * Hands this module an ALREADY-OPEN context/page to reuse instead of creating its own from
 * storageState - only meaningful within the SAME Playwright project/invocation as whoever calls
 * this (module state doesn't survive across separate `npx playwright test` processes or across
 * Playwright `projects`, confirmed live), used by tests/00-signup-flow/professional's own last
 * file to continue this suite as a real, freshly-created account instead of the usual stored one.
 * A no-op if this module already has a context (never overrides an in-progress session).
 */
function seedSharedPage(context, page) {
  if (sharedContext) return;
  sharedContext = context;
  sharedPage = page;
}

module.exports = { useSharedPage, closeSharedSession, seedSharedPage, AUTH_FILE, VIDEO_DIR };
