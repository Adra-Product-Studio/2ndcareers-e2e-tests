// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../support/sharedPage");
const { LearningEventFlow } = require("../../pages/professional/LearningEventFlow");
const { credentialsFor } = require("../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * Learning -> event details -> Book & Pay. Stops before the confirm/pay button - see
 * pages/professional/LearningEventFlow.js for why (real payment gateway).
 */
test.describe("Professional - learning event details and booking", () => {
  const session = useSharedPage(test, { videoName: "08-learning-book-and-pay" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login.spec.js to have signed in first.");

  test("opens an event's details with the expected keys and values", async () => {
    const flow = new LearningEventFlow(session.page);
    await flow.openFirstListingDetails();
    await flow.checkDetailPage();
  });

  test("Register leads to a Book & Pay page with a correct summary", async () => {
    const flow = new LearningEventFlow(session.page);
    await flow.openFirstListingDetails();
    await flow.goToBookAndPay();
  });
});
