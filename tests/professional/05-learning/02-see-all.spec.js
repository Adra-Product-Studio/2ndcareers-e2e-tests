// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalSeeAllPage } = require("../../../pages/professional/learning/SeeAllPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * app/(routes)/professional/learning/see_all/page.js redirects straight back to
 * /professional/learning whenever `q` isn't one of recording/resources/perspectives
 * (see_all/page.js:186-193) - confirmed in code. The 3 valid modes are already covered via real
 * clicks in 01-marketplace.spec.js; this file covers the redirect-away edge cases by direct URL.
 *
 * The only 2 page.goto() calls in this whole suite live here (see SeeAllPage.js), and
 * deliberately so: an invalid/missing `?q=` isn't reachable by clicking anything real in the
 * app - there's no button that produces that URL - so testing this redirect-guard at all means
 * typing the URL directly, the same way a person hitting a stale/bad link would. Both bounce
 * straight back to the marketplace this file started on, leaving 03-internal-event.spec.js free
 * to continue from there without any navigation of its own.
 */
test.describe("Professional - Learning - see_all edge cases", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("an invalid ?q= value redirects back to the marketplace", async () => {
    const seeAll = new ProfessionalSeeAllPage(session.page);
    await seeAll.gotoWithInvalidQuery();
  });

  test("a missing ?q= value also redirects back to the marketplace", async () => {
    const seeAll = new ProfessionalSeeAllPage(session.page);
    await seeAll.gotoWithMissingQuery();
  });
});
