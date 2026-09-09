// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalMarketplacePage } = require("../../../pages/professional/learning/MarketplacePage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Learning - Marketplace", () => {
  const session = useSharedPage(test, { videoName: "05-learning-01-marketplace" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with the expected data and Featured Listings", async () => {
    const learning = new ProfessionalMarketplacePage(session.page);
    await learning.waitForLoad();
  });

  test("shows every section title, scrolling to find each", async () => {
    const learning = new ProfessionalMarketplacePage(session.page);
    await learning.checkAllSectionTitles();
  });

  test("Connect with Experts / Learn Live: 'See all' only shows past 3 listings", async () => {
    const learning = new ProfessionalMarketplacePage(session.page);
    await learning.checkConnectWithExpertsVisibility();
    await learning.checkLearnLiveVisibility();
  });

  test("On Demand / Resources / Perspectives open their own listing pages", async () => {
    test.setTimeout(120_000);
    const learning = new ProfessionalMarketplacePage(session.page);

    await learning.goToOnDemand();
    await learning.backToLearnings();

    await learning.goToResources();
    await learning.backToLearnings();

    await learning.goToPerspectives();
    await learning.backToLearnings();
  });
});
