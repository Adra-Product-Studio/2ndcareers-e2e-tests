// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalProfilePage } = require("../../../pages/professional/profile/ProfilePage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Profile - About", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  // 01-load-and-sections.spec.js already loaded /professional/profile and is still on it (this
  // whole chapter works section-by-section on one already-open page, no navigation between files).
  test("edits to a temporary value, then restores the original", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    await profile.checkAboutEditRevert();
  });
});
