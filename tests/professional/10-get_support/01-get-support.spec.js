// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalGetSupportPage } = require("../../../pages/professional/get_support/GetSupportPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Get Support", () => {
  const session = useSharedPage(test, { videoName: "10-get-support-01-get-support" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads the static Coming Soon placeholder", async () => {
    const getSupport = new ProfessionalGetSupportPage(session.page);
    await getSupport.goto();
  });
});
