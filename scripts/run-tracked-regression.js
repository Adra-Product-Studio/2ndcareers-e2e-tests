#!/usr/bin/env node
// @ts-check

/**
 * Orchestrates one full tracked run:
 *   1. Creates + verifies a brand new dummy professional account, logs in, and completes the
 *      first-time overlay + JoyRide (tests/00-signup-flow).
 *   2. WITHOUT closing that browser - a real person doesn't close their browser and open a new
 *      one just to keep using the app they just joined - continues straight into the existing
 *      professional regression suite (tests/professional, minus 01-login: there's no reason for a
 *      person who just logged in for real to immediately go test the anonymous login page again)
 *      as that SAME new account, all as one continuous Playwright invocation/browser session.
 *   3. Separately (a genuinely different account, so this next part necessarily starts its own
 *      browser) runs the full existing professional regression suite again, logged in as the
 *      existing long-lived seeded account ("existing user") - so both experiences get checked
 *      every run, not just one.
 *   4. Appends one combined record to tests/history/signup-user-log.json - a durable,
 *      append-only audit trail of every dummy account this suite has ever created and what
 *      happened around it, and everything from every suite this run touched, not just signup.
 * Clears Playwright's own heavy test-results/playwright-report artifacts before each run so they
 * don't accumulate across many runs; the JSON log itself lives outside test-results/ specifically
 * so it survives that wipe.
 *
 * Usage:
 *   node scripts/run-tracked-regression.js
 *   SIGNUP_LOG_PROJECT=chromium SIGNUP_LOG_HEADED=true node scripts/run-tracked-regression.js
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { readHandoffState } = require("../support/signupRunLog");

const ROOT = path.join(__dirname, "..");

// This script runs as its OWN Node process, separate from every `npx playwright test` child it
// spawns - playwright.config.js loads .env.test for those children automatically, but nothing
// does that for this process itself, so PROFESSIONAL_TEST_EMAIL/etc. would otherwise read back
// undefined here even though the child processes see them fine. Same minimal parse as
// playwright.config.js's own loader.
const envTestPath = path.join(ROOT, ".env.test");
if (fs.existsSync(envTestPath)) {
  for (const line of fs.readFileSync(envTestPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] === undefined) process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

const TEST_RESULTS_DIR = path.join(ROOT, "test-results");
const PLAYWRIGHT_REPORT_DIR = path.join(ROOT, "playwright-report");
const LOG_PATH = path.join(ROOT, "tests", "history", "signup-user-log.json");
const NEW_USER_JSON_REPORT_PATH = path.join(TEST_RESULTS_DIR, ".professional-suite-new-user-report.json");
const EXISTING_USER_JSON_REPORT_PATH = path.join(TEST_RESULTS_DIR, ".professional-suite-existing-user-report.json");
const PROFESSIONAL_TESTS_DIR = path.join(ROOT, "tests", "professional");

const project = process.env.SIGNUP_LOG_PROJECT || "chrome";
const extraArgs = process.env.SIGNUP_LOG_HEADED === "true" ? ["--headed"] : [];

/** Best-effort cleanup, not a hard requirement - confirmed live: fs.rmSync's own `force: true`
 * only swallows "doesn't exist" errors, not a genuinely locked file (EBUSY/EPERM), which crashed
 * this whole script outright the one time a leftover browser process (from an earlier run killed
 * mid-recording) still held one of its own video files open. A stale leftover artifact sitting
 * around for one more run is a far smaller problem than the entire tracked run never starting. */
function clearDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Could not fully clear ${dir} (${error.code || error.message}) - continuing anyway.`);
  }
}

function runPlaywright(args, extraEnv = {}) {
  const result = spawnSync("npx", ["playwright", "test", ...args], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  return result.status ?? 1;
}

/** Every tests/professional/* subdirectory except 01-login - re-testing the anonymous login page
 * makes no sense against a session that's already logged in for real (the "new user" merged run's
 * whole point). Read fresh each time rather than hardcoded, so a future new professional test
 * folder is picked up automatically without editing this script. */
function professionalDirsExcludingLogin() {
  // Forward slashes, NOT path.join()'s backslashes - confirmed live: passing enough
  // backslash-separated path args through spawnSync's shell:true on Windows silently corrupted
  // the command Playwright actually received (it only ever saw the first path argument, as if the
  // rest vanished), while the exact same paths with forward slashes work correctly. Playwright
  // itself accepts forward slashes fine on Windows regardless.
  return fs
    .readdirSync(PROFESSIONAL_TESTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "01-login")
    .map((entry) => `tests/professional/${entry.name}`);
}

/** Walks the JSON reporter's nested suites/specs, tallying only specs whose own file path starts
 * with `filePrefix` - needed because the "new user" pass runs 00-signup-flow and tests/professional
 * in ONE invocation/one report, and this schema's counts are meant to reflect the professional
 * suite alone, not conflated with signup's own separately-tracked signup_test_status. Reads each
 * spec's actual result status (not the top-level `ok` flag, which is also true for a skipped spec
 * - confirmed live) since "passed" and "skipped" need to be counted separately. */
function readProfessionalStats(reportPath, filePrefix) {
  const totals = { passed: 0, failed: 0, skipped: 0 };
  try {
    const data = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    const walk = (suite) => {
      for (const spec of suite.specs || []) {
        const specFile = String(spec.file || "").replace(/\\/g, "/");
        if (filePrefix && !specFile.startsWith(filePrefix)) continue;
        const status = spec.tests?.[0]?.results?.[0]?.status;
        if (status === "passed") totals.passed++;
        else if (status === "skipped") totals.skipped++;
        else totals.failed++;
      }
      for (const sub of suite.suites || []) walk(sub);
    };
    for (const suite of data.suites || []) walk(suite);
  } catch {
    // Report missing or unreadable (e.g. this pass never ran) - zeros are the honest answer.
  }
  return { total: totals.passed + totals.failed + totals.skipped, ...totals };
}

function readLatestHistoryEmail() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
    if (!Array.isArray(parsed) || parsed.length === 0) return "";
    return parsed[parsed.length - 1]?.email_id || "";
  } catch {
    return "";
  }
}

function appendLogRecord(record) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  let history = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
    if (Array.isArray(parsed)) history = parsed;
  } catch {
    // No existing log yet, or it's unreadable - start a fresh history rather than crash the run.
  }
  history.push(record);
  fs.writeFileSync(LOG_PATH, JSON.stringify(history, null, 2));
}

function buildAiSummary(handoff) {
  if (!handoff?.aiSummary) return "No persona details captured (signup did not reach the About You step).";
  const source = handoff.aiGenerated ? "AI-generated" : "randomized fallback";
  return `${handoff.firstName} ${handoff.lastName} - ${handoff.aiSummary} (city: ${handoff.city}, years_of_experience: ${handoff.yearsOfExperience}, ${source})`;
}

console.log("Clearing previous Playwright test-results/report artifacts...");
clearDir(TEST_RESULTS_DIR);
clearDir(PLAYWRIGHT_REPORT_DIR);

console.log(
  `\n=== Running signup-flow (project: ${project}) straight into the existing professional suite as that SAME new account - one continuous browser session, no restart in between ===`
);
// tests/00-signup-flow is named to sort BEFORE tests/professional (Playwright always runs files
// in alphabetical order regardless of the order given here, confirmed live) - that ordering is
// what makes the hand-off in 05-first-time-home.spec.js's afterAll land before any
// tests/professional file's own useSharedPage() call runs.
const mergedExitCode = runPlaywright(
  ["tests/00-signup-flow", ...professionalDirsExcludingLogin(), "--project", project, ...extraArgs, "--reporter", "list,json"],
  { PLAYWRIGHT_JSON_OUTPUT_NAME: NEW_USER_JSON_REPORT_PATH, MERGE_NEW_USER_INTO_PROFESSIONAL_SUITE: "true" }
);
// The merged invocation's own overall exit code reflects BOTH phases at once, so signup's own
// pass/fail can't be read off it alone - the handoff file (written after every signup-flow test,
// see support/signupSharedPage.js) is the real signal for whether signup itself succeeded.
const handoff = readHandoffState();
const signupPassed = Boolean(handoff?.emailVerifiedOn);
const newUserStats = readProfessionalStats(NEW_USER_JSON_REPORT_PATH, "professional/");

console.log(`\n=== Running the existing professional regression suite AS THE EXISTING USER (project: ${project}) ===`);
const existingUserExitCode = runPlaywright(["tests/professional", "--project", project, ...extraArgs, "--reporter", "list,json"], {
  PLAYWRIGHT_JSON_OUTPUT_NAME: EXISTING_USER_JSON_REPORT_PATH,
});
const existingUserStats = readProfessionalStats(EXISTING_USER_JSON_REPORT_PATH, "professional/");

const record = {
  user_role: handoff?.role || "professional",
  email_id: handoff?.email || readLatestHistoryEmail(),
  created_on: handoff?.createdOn || null,
  email_verified_on: handoff?.emailVerifiedOn || null,
  signup_test_status: signupPassed ? "passed" : "failed",
  professional_view_test_cases_count: newUserStats.total,
  professional_test_case_passed_count: newUserStats.passed,
  professional_view_test_cases_skipped_count: newUserStats.skipped,
  professional_view_test_cases_failed_count: newUserStats.failed,
  existing_user_email_id: process.env.PROFESSIONAL_TEST_EMAIL || "",
  existing_user_view_test_cases_count: existingUserStats.total,
  existing_user_test_case_passed_count: existingUserStats.passed,
  existing_user_view_test_cases_skipped_count: existingUserStats.skipped,
  existing_user_test_case_failed_count: existingUserStats.failed,
  profile_creation_ai_summary: buildAiSummary(handoff),
  logged_at: new Date().toISOString(),
};

appendLogRecord(record);

console.log("\n=== Run summary (appended to tests/history/signup-user-log.json) ===");
console.log(JSON.stringify(record, null, 2));

process.exit(mergedExitCode !== 0 || existingUserExitCode !== 0 ? 1 : 0);
