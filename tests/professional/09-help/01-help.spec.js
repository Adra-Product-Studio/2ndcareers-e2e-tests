// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalHelpPage } = require("../../../pages/professional/help/HelpPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Help", () => {
  const session = useSharedPage(test, { videoName: "09-help-01-help" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with at least one help video", async () => {
    const help = new ProfessionalHelpPage(session.page);
    await help.goto();
    await help.checkVideos();
  });
});
