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
 */
test.describe("Professional - Learning - see_all edge cases", () => {
  const session = useSharedPage(test, { videoName: "05-learning-02-see-all" });
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
