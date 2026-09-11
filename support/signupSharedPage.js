// @ts-check
const { state } = require("./signupState");
const { writeHandoffState } = require("./signupRunLog");

// Deliberately a SEPARATE module-level singleton from support/sharedPage.js - this flow creates
// a brand new account every run (see fixtures/signupCredentials.js) and must never share a
// browser context/storageState with the main numbered suite's already-authenticated session. Two
// independent singletons in two independent modules can't collide even if both happen to be
// required within the same Playwright worker process.
let sharedContext = null;
let sharedPage = null;

/**
 * One continuous, logged-OUT browser context/page for the whole signup-flow suite (role
 * selection -> new_user_signup -> about_you -> your_career_story -> signup_success), same
 * "real click, not a fresh page.goto()" pattern as the main suite's useSharedPage - moving from
 * one signup step to the next is what the real multi-step wizard's own Next/Submit buttons do,
 * not a manual navigation. Mailinator verification and the first real login are deliberately
 * separate real page.goto()s (see 05-email-verification-and-login.spec.js) - there's no in-app
 * click path from this app to Mailinator's own site, and logging in is itself a fresh, unauthenticated
 * page load by definition.
 */
function useSignupSharedPage(test) {
  test.describe.configure({ mode: "serial" });

  const session = { page: null, context: null };

  test.beforeAll(async ({ browser }) => {
    if (!sharedContext) {
      sharedContext = await browser.newContext({
        recordVideo: {
          dir: require("path").join(__dirname, "..", "test-results", "videos", "signup-flow"),
          size: { width: 1600, height: 900 },
        },
      });
      sharedPage = await sharedContext.newPage();
    }
    session.context = sharedContext;
    session.page = sharedPage;
  });

  // Writes whatever signupState.js knows after EVERY test, not just at the very end - runs
  // regardless of that test's own pass/fail/skip outcome, so a run that stops partway (a real
  // failure, a timeout, this whole process being killed mid-suite) still leaves behind whatever
  // was genuinely accomplished up to that point, instead of only ever logging a complete run.
  test.afterEach(async () => {
    writeHandoffState(state);
  });

  return session;
}

/** Call once, from the last file in this flow's run order, to close the recording cleanly. */
async function closeSignupSharedSession() {
  if (sharedContext) {
    await sharedContext.close();
    sharedContext = null;
    sharedPage = null;
  }
}

module.exports = { useSignupSharedPage, closeSignupSharedSession };
