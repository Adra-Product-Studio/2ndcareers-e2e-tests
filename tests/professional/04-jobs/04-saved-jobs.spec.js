// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalSavedJobsPage } = require("../../../pages/professional/jobs/SavedJobsPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Jobs - Saved", () => {
  const session = useSharedPage(test, { videoName: "04-jobs-04-saved" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads the empty state (the real Save/Remove cycle lives in 01-all-jobs.spec.js)", async () => {
    const saved = new ProfessionalSavedJobsPage(session.page);
    const jobs = await saved.waitForLoad();
    expect(jobs.length).toBe(0);
    await saved.checkEmptyState();
  });

  test("search still hits the server (POST /search_result_saved) even with nothing to match", async () => {
    const saved = new ProfessionalSavedJobsPage(session.page);
    const data = await saved.searchFor("developer");
    expect(data).toBeTruthy();
  });
});
