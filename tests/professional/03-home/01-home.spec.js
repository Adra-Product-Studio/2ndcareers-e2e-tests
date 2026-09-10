// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalHomePage } = require("../../../pages/professional/home/HomePage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * /professional/home. This account sits at a fixed ~53% profile completion (confirmed live) -
 * real enough for the two happy-path checks below, but real data alone can't reach every branch
 * of app/(routes)/professional/home/page.js's profile_percentage conditionals (dynamic_profile_content,
 * render_jobs_carousel) or the first-time-user overlay/JoyRide flow. Those are covered separately
 * in this same folder via response mocking and cookie simulation, not skipped as out of scope:
 * see 02-percentage-branches.spec.js and 03-first-time-overlay-and-joyride.spec.js.
 *
 * The raw JSON envelope for Home's own data (including the exact profile_percentage) is already
 * captured and verified once, in 01-login.spec.js - that post-login redirect is the one moment
 * Home mounts genuinely fresh this session, and 02-navigation.spec.js deliberately leaves the
 * session sitting right there without navigating anywhere else (see its own doc comment) - so
 * this file just checks the UI that's already rendered, rather than re-navigating (which,
 * confirmed live, Next.js's client router cache can serve from cache with no new matching network
 * call at all - see HomePage.checkAlreadyLoaded).
 */
test.describe("Professional - Home", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("shows every card", async () => {
    const home = new ProfessionalHomePage(session.page);
    await home.checkAlreadyLoaded();
  });

  test("Notification bell opens and closes the notifications panel", async () => {
    const header = new HeaderMenu(session.page);
    await header.checkNotificationsPanel();
  });

  test("COMMUNITY quick-access card opens the external app in a new tab", async () => {
    const home = new ProfessionalHomePage(session.page);
    await home.checkCommunityCardOpensExternalApp();
  });
});
