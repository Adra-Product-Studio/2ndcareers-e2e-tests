// @ts-check
const fs = require("fs");
const path = require("path");
const { defineConfig, devices } = require("@playwright/test");

// Minimal .env.test loader (no dotenv dependency) - only fills vars not already set,
// so real CI secrets always win over whatever is in the file.
const envTestPath = path.resolve(__dirname, ".env.test");
if (fs.existsSync(envTestPath)) {
  for (const line of fs.readFileSync(envTestPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] === undefined) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
if (!BASE_URL) {
  throw new Error(
    "PLAYWRIGHT_BASE_URL is required - point it at the staging/QA environment (copy .env.test.example to .env.test and fill it in)."
  );
}

// Slows down every action (fill, click, etc.) by this many ms so a headed run is watchable.
const SLOW_MO = Number(process.env.PW_SLOWMO) || 0;

// Launches Chrome at a large, fixed window size instead of the default 1280x720 window. A FIXED
// size set at launch, not native OS maximize (--start-maximized) - that resizes the window AFTER
// launch, which was confirmed live to invalidate Google Places Autocomplete's own dropdown
// position calculation (About You's city field) mid-run. Setting matching --window-size args and
// a same-size viewport up front means the window is already at its final size before any page
// ever loads, so nothing resizes out from under a page that's already rendered.
const MAXIMIZE = process.env.PW_MAXIMIZE === "true";
const FIXED_WINDOW_SIZE = { width: 1600, height: 900 };

// Auto-opens the HTML report in the browser once the run finishes.
const OPEN_REPORT = process.env.PW_OPEN_REPORT === "true";

module.exports = defineConfig({
  testDir: "./tests",
  // Generous enough to cover a cold Turbopack compile of the page under test on a local dev
  // server (each spec navigates fresh, see pages/professional/*.js) - a built staging/CI run
  // finishes well under this.
  timeout: 60 * 1000,
  // Required: tests/professional/*.spec.js are numbered (01-09) and depend on running in that
  // exact order - 01-login.spec.js saves a storageState file that every later file's
  // beforeAll loads (see support/sharedPage.js) to start already authenticated. Multiple
  // workers or fullyParallel would run files out of order or concurrently and break that.
  fullyParallel: false,
  workers: 1,
  // Always 0, even in CI: the whole numbered suite now shares ONE continuous browser
  // context/page/video (see support/sharedPage.js) so moving "to another page" is a real
  // nav-link/tab click instead of a fresh page.goto() between files. A retry re-runs only the
  // failing file in a new worker, which can't reconstruct the exact page state the files before
  // it left behind (which tab/section/modal was open) - so a mid-suite retry would just fail
  // again for the wrong reason. A real, un-retried failure surfaces clearly instead.
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: OPEN_REPORT ? "always" : "never" }],
    // Playwright's own GitHub Actions reporter - groups each spec file as a collapsible
    // section in the run log and adds inline annotations on failures (file/line + error),
    // instead of a flat wall of "list" output. Only active in CI; local runs are unaffected.
    ...(process.env.CI ? [["github"]] : []),
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Video is NOT set here - no test ever touches Playwright's own page/context fixture (see
    // support/sharedPage.js for why), so a `video` option here would silently do nothing.
    // Recording is requested directly on each file's newContext() call instead, keyed by
    // `videoName` - one continuous .webm per spec file, which scripts/merge-videos.js then
    // stitches into the single file CI uploads as e2e-automation-<sha>.
    viewport: MAXIMIZE ? FIXED_WINDOW_SIZE : undefined,
    launchOptions: {
      slowMo: SLOW_MO,
      args: MAXIMIZE
        ? [`--window-size=${FIXED_WINDOW_SIZE.width},${FIXED_WINDOW_SIZE.height}`, "--window-position=20,20"]
        : [],
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
});
