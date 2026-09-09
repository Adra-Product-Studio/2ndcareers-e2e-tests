// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage, closeSharedSession } = require("../../../support/sharedPage");
const { ProfessionalUpgradePage } = require("../../../pages/professional/upgrade/UpgradePage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { LoginPage } = require("../../../pages/LoginPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * The last file in the numbered suite (see support/sharedPage.js) - also where the one
 * continuous session/page/video the whole suite shares (01-login .. here) finally signs out and
 * closes, finalizing that one video file.
 */
test.describe("Professional - Upgrade", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("shows all 3 pricing tiers, currently all 'Coming Soon'", async () => {
    const upgrade = new ProfessionalUpgradePage(session.page);
    const header = new HeaderMenu(session.page);
    // 10-get_support left the session on /professional/get_support (reached by direct URL, see
    // that file) - the header still persists there, so arrive here via the real profile-dropdown
    // "Upgrade" click rather than a fresh page.goto().
    await upgrade.goto(() => header.goToProfileMenuLink("Upgrade"));
    await upgrade.checkTiers();
  });

  test("sign out from the profile menu, back to the login page", async () => {
    const header = new HeaderMenu(session.page);
    await header.signOut();

    const loginPage = new LoginPage(session.page);
    await expect(loginPage.heading).toBeVisible();
    await expect(session.page).toHaveURL(/\/$/);
  });

  test.afterAll(async () => {
    await closeSharedSession();
  });
});
