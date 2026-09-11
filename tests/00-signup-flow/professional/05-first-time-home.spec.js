// @ts-check
const { test, expect } = require("@playwright/test");
const { useSignupSharedPage, closeSignupSharedSession } = require("../../../support/signupSharedPage");
const { seedSharedPage } = require("../../../support/sharedPage");
const { ProfessionalProfileOverlay } = require("../../../pages/professional/home/ProfileOverlay");
const { ProfessionalHomeJoyRide } = require("../../../pages/professional/home/JoyRide");
const { ProfessionalHomePage } = require("../../../pages/professional/home/HomePage");
const { signupTestConfig } = require("../../../fixtures/signupCredentials");
const { state } = require("../../../support/signupState");

// Set by scripts/run-tracked-regression.js's "new user" pass, which runs THIS file and
// tests/professional in one combined invocation (same project, same worker process) so a real
// person's actual continuous flow - sign up, verify, log in, finish the overlay/JoyRide, then just
// keep using the app - is what the browser actually does too, instead of closing here and a
// separate process opening a brand new window for the next phase.
const MERGE_INTO_PROFESSIONAL_SUITE = process.env.MERGE_NEW_USER_INTO_PROFESSIONAL_SUITE === "true";

const { hasConfig } = signupTestConfig();

/**
 * The real first-time-user experience on a GENUINELY brand new account (not the mocked
 * error_code:200 simulation tests/professional/03-home/03-first-time-overlay-and-joyride.spec.js
 * runs against the suite's one long-lived shared account) - this account was created seconds ago
 * by this same signup-flow suite and is thrown away after this run, so every action here is a
 * real submission, nothing needs mocking or restoring afterward. Reuses the main suite's own
 * ProfileOverlay/JoyRide/HomePage Page Objects directly - they're plain classes parametrized by
 * `page`, not coupled to that suite's own shared-session singleton, so they work identically here.
 * Deliberately does NOT call HomePage.checkCards() - that method asserts the >30% job-carousel
 * elements (Latest Jobs/Explore jobs/Apply), which don't render at all in the <=30% stats-card
 * branch this brand new account's real, low profile_percentage lands it in (confirmed live).
 */
test.describe("Signup - first-time Home experience (real account, not mocked)", () => {
  const session = useSignupSharedPage(test);
  test.skip(!hasConfig, "Set MAILINATOR_USERNAME / MAILINATOR_PASSWORD / SIGNUP_TEST_EMAIL_DOMAIN in .env.test to run the signup-flow suite.");

  test("logging in for the first time opens the real Profile overlay, driven by the real error_code:200 response", async () => {
    const page = session.page;
    // 05-email-verification-and-login.spec.js already logged in and landed here, and captured
    // this same real /professional_updated_home response's profile_percentage into signupState -
    // this file's own network activity has long since finished by the time it runs, so there's
    // no fresh response left to wait for here.
    const overlay = new ProfessionalProfileOverlay(page);
    await overlay.waitForOpen();
  });

  test("completing the overlay for real (no mocking - this account is thrown away after this run) closes it and reveals the JoyRide", async () => {
    const page = session.page;
    const overlay = new ProfessionalProfileOverlay(page);
    // A real submission, not overlay.completeSafely() (which intercepts /professional_register
    // specifically so the suite's own long-lived shared account is never actually mutated) -
    // this account has no "real" state worth protecting, it exists only for this one run.
    await overlay.firstJobTypeOption.click();
    await overlay.firstLocationPreferenceOption.click();
    await overlay.willingToRelocateYesOption.click();
    const [response] = await Promise.all([
      page.waitForResponse(/\/professional_register/, { timeout: 15_000 }),
      overlay.confirmButton.click(),
    ]);
    const json = await response.json();
    expect(response.ok()).toBe(true);
    expect(json.error_code).toBe(0);
    await expect(overlay.heading).toBeHidden();

    const joyRide = new ProfessionalHomeJoyRide(page);
    await joyRide.waitForFirstStep();
  });

  test("clicking through every real JoyRide step closes the tour", async () => {
    const joyRide = new ProfessionalHomeJoyRide(session.page);
    await joyRide.completeAll();
  });

  test("the real profile_percentage this account landed at drives the exact home page content the code says it should", async () => {
    const home = new ProfessionalHomePage(session.page);
    await expect(home.pathwaysHeading).toBeVisible();

    if (state.profilePercentage === null) {
      test.skip(true, "Couldn't read the real /professional_updated_home response captured during login - nothing to assert a specific bucket against.");
      return;
    }

    if (state.profilePercentage < 60) {
      await home.checkDynamicProfileContent(state.profilePercentage);
    }
    await home.checkJobsCarouselBranch(state.profilePercentage);
  });

  test.afterAll(async () => {
    // signupSharedPage.js's own afterEach already writes signupState.js's handoff file after
    // every test in this whole flow, so nothing extra is needed here for that.
    if (MERGE_INTO_PROFESSIONAL_SUITE) {
      // Hand this SAME still-open context/page to support/sharedPage.js's own singleton instead
      // of closing it - tests/professional/**'s own files (running right after this one, in the
      // same invocation, sorted after "00-signup-flow" specifically so this ordering holds) will
      // find a context already waiting for them and reuse it rather than opening a fresh one from
      // storageState, continuing as this real new account with no browser restart in between.
      seedSharedPage(session.context, session.page);
      return;
    }
    // The very last file in this whole signup-flow suite - finalizes the one continuous
    // recording, same pattern as the main suite's 11-upgrade.spec.js.
    await closeSignupSharedSession();
  });
});
