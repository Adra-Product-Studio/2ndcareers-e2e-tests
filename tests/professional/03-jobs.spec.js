// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../support/sharedPage");
const { ProfessionalJobsPage } = require("../../pages/professional/JobsPage");
const { credentialsFor } = require("../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - jobs", () => {
  const session = useSharedPage(test, { videoName: "03-jobs" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login.spec.js to have signed in first.");

  test("loads job listings with the expected keys and values", async () => {
    const jobs = new ProfessionalJobsPage(session.page);
    const data = await jobs.gotoAndLoad();

    expect(data.total_count).toBeGreaterThan(0);
    expect(data.job_details.length).toBeGreaterThan(0);
    expect(data.job_details.length).toBeLessThanOrEqual(data.total_count);

    for (const job of data.job_details) {
      expect(["not_applied", "applied"]).toContain(job.applied_status);
      expect(["saved", "unsaved"]).toContain(job.saved_status);
    }
  });

  test("shows the tabs, search, and filter controls", async () => {
    const jobs = new ProfessionalJobsPage(session.page);
    await jobs.goto();
    await jobs.checkPageElements();
  });

  test("Recommended tab loads (0 AI-matched jobs for this account)", async () => {
    const jobs = new ProfessionalJobsPage(session.page);
    await jobs.gotoRecommendedTab();
  });

  test("Applied tab loads with the expected keys and values", async () => {
    const jobs = new ProfessionalJobsPage(session.page);
    await jobs.gotoAppliedTab();
  });

  test("Saved tab loads with the expected keys and values", async () => {
    const jobs = new ProfessionalJobsPage(session.page);
    await jobs.gotoSavedTab();
  });

  test("clicking a job opens its detail pane with matching content", async () => {
    const jobs = new ProfessionalJobsPage(session.page);
    await jobs.goto();
    const job = await jobs.openFirstJobDetail();
    await jobs.checkJobDetailPane(job.job_title);
  });
});
