// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalHomePage } = require("../../../pages/professional/home/HomePage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * /professional/home. This account sits at ~53% profile completion (confirmed live), which
 * determines two independent conditionals in app/(routes)/professional/home/page.js:
 *   - dynamic_profile_content (line ~22): <60% shows the "complete your profile" CTA/copy -
 *     the >=60% bucket's CTA links to /professional/learning/hub/live_sessions, which 404s (only
 *     reachable inside the dead _learning/hub tree) - NOT triggerable with this account's real
 *     state, so that dangling-link bug is documented here rather than exercised.
 *   - render_jobs_carousel (line ~74): <=30% shows a stats-card row instead of a jobs carousel;
 *     53% is above that, so the carousel (Latest/Featured Jobs) is the branch actually covered.
 * Testing the <=30% and >=60% buckets would need a second account seeded at those percentages -
 * out of scope for this single shared account.
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
