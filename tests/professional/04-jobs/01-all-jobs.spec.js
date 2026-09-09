// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalAllJobsPage } = require("../../../pages/professional/jobs/AllJobsPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - Jobs - All Jobs", () => {
  const session = useSharedPage(test, { videoName: "04-jobs-01-all" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads the listing, tabs, search, and filter controls", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    const data = await jobs.waitForLoad();
    expect(data.total_count).toBeGreaterThan(0);
    expect(data.job_details.length).toBeGreaterThan(0);
    await jobs.checkPageElements();
  });

  test("opens a job's detail pane by clicking its card", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    const job = await jobs.openFirstJobDetail();
    await jobs.checkJobDetailPane(job.job_title);
  });

  test("Apply Now is gated behind profile completion for this account", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    await jobs.checkApplyGatedByIncompleteProfile();
  });

  test("search filters the list via POST /admin_jobs_meilisearch, then clears back to the full list", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    const { filteredCount, restoredCount } = await jobs.searchFor("developer");
    expect(filteredCount).toBeLessThan(restoredCount);
  });

  test("Filter panel shows every field and applies without changing results", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    await jobs.checkFilterPanel();
  });

  test("Save then Remove a job, leaving the account's saved list untouched", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    await jobs.goto();
    const job = await jobs.openFirstJobDetail();
    await jobs.saveThenRemoveJob(job.job_title);
  });
});
