// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalProfilePage } = require("../../../pages/professional/profile/ProfilePage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Profile - Languages", () => {
  const session = useSharedPage(test, { videoName: "07-profile-07-languages" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("adds a temporary language, then deletes it", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    await profile.waitForLoad();
    await profile.addThenDeleteLanguage();
  });
});
