// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalAppliedJobsPage } = require("../../../pages/professional/jobs/AppliedJobsPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Jobs - Applied", () => {
  const session = useSharedPage(test, { videoName: "04-jobs-03-applied" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads the empty state (this account never actually submits an application - see AllJobsPage)", async () => {
    const applied = new ProfessionalAppliedJobsPage(session.page);
    const jobs = await applied.waitForLoad();
    expect(jobs.length).toBe(0);
    await applied.checkEmptyState();
  });

  test("search still hits the server (POST /search_result_applied) even with nothing to match", async () => {
    const applied = new ProfessionalAppliedJobsPage(session.page);
    const data = await applied.searchFor("developer");
    expect(data).toBeTruthy();
  });
});
