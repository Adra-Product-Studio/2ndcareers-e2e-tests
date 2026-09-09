// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../support/sharedPage");
const { HeaderMenu } = require("../../pages/professional/HeaderMenu");
const { ProfessionalProfilePage } = require("../../pages/professional/ProfilePage");
const { ProfessionalUpgradePage } = require("../../pages/professional/UpgradePage");
const { ProfessionalHelpPage } = require("../../pages/professional/HelpPage");
const { credentialsFor } = require("../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * The 4 pages behind the header's profile-name dropdown (My Profile/Upgrade/Help/Get Support)
 * - Sign out itself is covered separately in 09-logout.spec.js.
 */
test.describe("Professional - profile dropdown pages", () => {
  const session = useSharedPage(test, { videoName: "07-profile-menu" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login.spec.js to have signed in first.");

  test("dropdown lists all 4 pages plus Sign out", async () => {
    const page = session.page;
    await page.goto("/professional/home");
    const header = new HeaderMenu(page);
    await header.checkProfileMenuLinks();
  });

  test("My Profile loads the real profile data and every section", async () => {
    const profile = new ProfessionalProfilePage(session.page);
    const data = await profile.gotoAndLoad();
    await profile.checkSections();

    expect(data.first_name.trim().length).toBeGreaterThan(0);
  });

  test("Upgrade shows all 3 pricing tiers", async () => {
    const upgrade = new ProfessionalUpgradePage(session.page);
    await upgrade.goto();
    await upgrade.checkTiers();
  });

  test("Help lists walkthrough videos", async () => {
    const help = new ProfessionalHelpPage(session.page);
    await help.goto();
    await help.checkVideos();
  });
});
