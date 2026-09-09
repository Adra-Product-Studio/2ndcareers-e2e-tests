// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalInternalEventFlow } = require("../../../pages/professional/learning/InternalEventFlow");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * IMPORTANT: the book_and_pay page's confirm button hits a real Razorpay checkout for paid
 * listings - this suite deliberately stops one step before clicking it. See
 * pages/professional/learning/InternalEventFlow.js.
 */
test.describe("Professional - Learning - internal event detail -> Book & Pay", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("opens the first listing's details, then Book & Pay", async () => {
    const flow = new ProfessionalInternalEventFlow(session.page);
    // 02-see-all.spec.js's own redirect-guard checks already left the session on the marketplace
    // root - no navigation needed to get there again.
    await flow.openFirstListingDetails(async () => {});
    await flow.checkDetailPage();
    await flow.goToBookAndPay();
  });
});
