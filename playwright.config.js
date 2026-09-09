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

// Launches Chrome maximized to the full screen instead of the default 1280x720 window.
const MAXIMIZE = process.env.PW_MAXIMIZE === "true";

// Auto-opens the HTML report in the browser once the run finishes.
const OPEN_REPORT = process.env.PW_OPEN_REPORT === "true";

module.exports = defineConfig({
  testDir: "./tests",
  // Generous enough to cover a cold Turbopack compile of the post-login route on a local
  // dev server (see tests/auth/login.shared.js) - a built staging/CI run finishes well under this.
  timeout: 60 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: OPEN_REPORT ? "always" : "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: MAXIMIZE ? null : undefined,
    launchOptions: {
      slowMo: SLOW_MO,
      args: MAXIMIZE ? ["--start-maximized"] : [],
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
});
