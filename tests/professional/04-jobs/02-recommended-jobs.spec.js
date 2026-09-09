// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalRecommendedJobsPage } = require("../../../pages/professional/jobs/RecommendedJobsPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Jobs - Recommended", () => {
  const session = useSharedPage(test, { videoName: "04-jobs-02-recommended" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("below the 60% profile-completion threshold, shows the complete-your-profile prompt instead of fetching jobs", async () => {
    const recommended = new ProfessionalRecommendedJobsPage(session.page);
    await recommended.waitForLoadBelowThreshold();
  });
});
