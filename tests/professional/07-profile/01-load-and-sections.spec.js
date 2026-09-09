// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalProfilePage } = require("../../../pages/professional/profile/ProfilePage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Profile - load and sections", () => {
  const session = useSharedPage(test, { videoName: "07-profile-01-load" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with the expected data and every section", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    const data = await profile.waitForLoad();
    expect(data.first_name.trim().length).toBeGreaterThan(0);
    await profile.checkSections();
  });

  test("Personal Details: Edit opens the real, pre-filled fields (not saved - see ProfilePage.checkPersonalDetailsOpensEditableFields)", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    await profile.checkPersonalDetailsOpensEditableFields();
  });

  test("Resume: shows the current file name and a working Download link", async () => {
    // Not automating upload/delete here - confirmed live that uploading ANY file (even the
    // current resume re-uploaded) re-parses and can overwrite other profile sections. See
    // ProfilePage.js's class doc comment.
    const profile = new ProfessionalProfilePage(session.page);
    await profile.checkResumeDisplay();
  });
});
