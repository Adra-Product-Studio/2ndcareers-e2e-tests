// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalProfilePage } = require("../../../pages/professional/profile/ProfilePage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Profile - Additional Information", () => {
  const session = useSharedPage(test, { videoName: "07-profile-08-additional-info" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("adds a temporary entry, then deletes it - the account's real certificates are untouched", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    await profile.waitForLoad();
    await profile.addThenDeleteAdditionalInfo();
  });
});
