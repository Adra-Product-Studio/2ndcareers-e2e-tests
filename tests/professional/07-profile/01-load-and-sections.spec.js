// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalProfilePage } = require("../../../pages/professional/profile/ProfilePage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Profile - load and sections", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with the expected data and every section", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    const header = new HeaderMenu(session.page);
    // 06-agents left the session on Career Copilots - arrive here via the real profile-dropdown
    // "My Profile" click rather than a fresh page.goto(). Every other file in this chapter
    // (02-about .. 09-unsavable-sections) then just keeps working on this SAME already-loaded
    // page - none of them navigate at all.
    const data = await profile.waitForLoad(() => header.goToProfileMenuLink("My Profile"));
    expect(data.first_name.trim().length).toBeGreaterThan(0);
    await profile.checkSections();
  });

  test("Resume: shows the current file name and a working Download link", async () => {
    // Not automating upload/delete here - confirmed live that uploading ANY file (even the
    // current resume re-uploaded) re-parses and can overwrite other profile sections. See
    // ProfilePage.js's class doc comment.
    const profile = new ProfessionalProfilePage(session.page);
    await profile.checkResumeDisplay();
  });

  // Personal Details' own "Edit opens the real, pre-filled fields" check, and Preference's
  // equivalent, both deliberately run LAST in this chapter - see
  // 09-unsavable-sections.spec.js's doc comment for why.
});
