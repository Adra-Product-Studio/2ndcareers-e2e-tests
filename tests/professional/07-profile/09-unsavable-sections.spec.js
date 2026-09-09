// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalProfilePage } = require("../../../pages/professional/profile/ProfilePage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * Personal Details and Preference share one real constraint that puts both of their checks here,
 * dead last in the 07-profile chapter, instead of living in their own numbered files: neither has
 * a Cancel button (Edit becomes Save in place, same inline pattern as About), and for THIS
 * account Save is permanently blocked for both - Personal Details requires a phone number this
 * account has never saved, and Preference's validator rejects submitting it back to blank once
 * touched (see ProfilePage.js's doc comments on checkPersonalDetailsOpensEditableFields and
 * checkPreferenceDisplay). So clicking Edit on either leaves it stuck showing its own "Save"
 * button for the rest of this already-loaded page's lifetime - confirmed live: every other
 * section's edit/add flow on this page (About, Experience, Education, Additional Information,
 * Social Links) reuses one shared, page-wide `getByRole("button", { name: "Save", exact: true })`
 * locator, and a stray extra "Save" left on-screen from either of these makes that locator
 * ambiguous (a strict-mode violation) the moment anything else tries to use it. Running both here,
 * after every other section's own Save-based test has already finished, avoids that entirely.
 */
test.describe("Professional - Profile - Personal Details & Preference (view-only)", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("Personal Details: Edit opens the real, pre-filled fields (not saved - see ProfilePage.checkPersonalDetailsOpensEditableFields)", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    await profile.checkPersonalDetailsOpensEditableFields();
  });

  test("Preference: shows the empty placeholder and Edit opens the real textarea (not exercised further - see ProfilePage.checkPreferenceDisplay)", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    await profile.checkPreferenceDisplay();
  });
});
