// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalAllJobsPage } = require("../../../pages/professional/jobs/AllJobsPage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * The All Jobs tab's complete real-world flow, in the order a person actually works through it:
 * load -> filter + search -> verify the results changed -> clear both back to the full list ->
 * jump to a random pagination page -> open a job from there -> save it -> Apply Now (gated by
 * this account's incomplete profile - see AllJobsPage.checkApplyGatedByIncompleteProfile) ->
 * confirm the saved job shows up on the Saved tab -> remove it, back to a clean All Jobs. Every
 * step after the first is a real click/tab-switch on the SAME page (no page.goto() anywhere in
 * this file) - moving "to another page" here always means clicking a tab, a job card, or a
 * button, the same as a person would.
 */
test.describe("Professional - Jobs - All Jobs - complete flow", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  // Shared between the last two tests below - both need to know which job was saved.
  let savedJobTitle = "";

  test("loads via a real nav-link click and shows every control", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    const header = new HeaderMenu(session.page);
    // 02-navigation left the session on 2C Agents - arrive here via the real Jobs nav-link click.
    const data = await jobs.waitForLoad(() => header.goToJobs());
    expect(data.total_count).toBeGreaterThan(0);
    expect(data.job_details.length).toBeGreaterThan(0);
    await jobs.checkPageElements();
  });

  test("applies a filter and a search together, verifies the results, then clears both back to the full list", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    const { initialCount, filteredByTypeCount, filteredAndSearchedCount, restoredCount } =
      await jobs.applyFilterAndSearch("manager");

    // Whichever Job Type happens to be first in the live dropdown, and layering "manager" on top
    // of it, can each legitimately land on zero matches (confirmed live - this is a real,
    // multi-thousand-job dataset that changes over time) - a valid, correctly-loaded empty state,
    // not a bug. So this doesn't assume either step has results; it only checks each step is a
    // well-formed count, that search only narrows the filtered set (never grows it), and that
    // clearing both restores the exact original count.
    expect(typeof filteredByTypeCount).toBe("number");
    expect(filteredAndSearchedCount).toBeLessThanOrEqual(filteredByTypeCount);
    expect(restoredCount).toBe(initialCount);
  });

  test("selects a random pagination page", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    const pageLabel = await jobs.goToRandomPage();
    test.skip(pageLabel === null, "Only one page of results right now - nothing to paginate to.");
    await expect(jobs.resultsCount).toBeVisible();
  });

  test("opens a job from the paginated results, saves it, then Apply Now is gated by this account's incomplete profile", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    const job = await jobs.openFirstJobDetail();
    await jobs.checkJobDetailPane(job.job_title);

    await jobs.saveCurrentJob();
    await jobs.checkApplyGatedByIncompleteProfile();

    savedJobTitle = job.job_title;
  });

  test("the saved job appears on the Saved tab; removing it returns the account to its original state", async () => {
    const jobs = new ProfessionalAllJobsPage(session.page);
    await jobs.verifyAndRemoveSavedJob(savedJobTitle);
  });
});
