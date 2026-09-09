// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalUpgradePage } = require("../../../pages/professional/upgrade/UpgradePage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Upgrade", () => {
  const session = useSharedPage(test, { videoName: "11-upgrade-01-upgrade" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("shows all 3 pricing tiers, currently all 'Coming Soon'", async () => {
    const upgrade = new ProfessionalUpgradePage(session.page);
    await upgrade.goto();
    await upgrade.checkTiers();
  });
});
