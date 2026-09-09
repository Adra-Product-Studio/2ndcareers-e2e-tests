// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalHelpPage } = require("../../../pages/professional/help/HelpPage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Help", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with at least one help video", async () => {
    const help = new ProfessionalHelpPage(session.page);
    const header = new HeaderMenu(session.page);
    // 08-community left the session on /professional/community (reached by direct URL, see that
    // file) - the header still persists there, so arrive here via the real profile-dropdown
    // "Help" click rather than a fresh page.goto().
    await help.goto(() => header.goToProfileMenuLink("Help"));
    await help.checkVideos();
  });
});
