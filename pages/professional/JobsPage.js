// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * /professional/jobs/all_jobs and its 3 tabs. All 4 tabs share the same header/tab-bar; each
 * has its own listing endpoint - captured live, see e2e-tests/README.md:
 *   All Jobs      POST /professional_dashboard  (data: {job_details: [...], total_count, ...filters})
 *   Recommended   no call fires for this test account (0 matches) - handled as a valid empty state
 *   Applied       POST /professional_applied_jobs  (data: {} when there are none)
 *   Saved         POST /professional_saved_jobs    (data: {} when there are none)
 * Tabs and job cards are real <a>/clickable elements - clicked directly rather than navigated to
 * via page.goto(), so these stay real Next.js client-side transitions, not full reloads.
 * Clicking a job card opens a detail pane in the same page (URL gains an encrypted slug) backed
 * by POST /selected_job_details (data: [{job_id, job_title, applied_status, saved_status, ...}]).
 */
class ProfessionalJobsPage {
  constructor(page) {
    this.page = page;
    this.allJobsTab = page.getByRole("link", { name: "All Jobs" });
    this.recommendedTab = page.getByRole("link", { name: "Recommended" });
    this.appliedTab = page.getByRole("link", { name: "Applied" });
    this.savedTab = page.getByRole("link", { name: "Saved" });
    this.searchInput = page.getByPlaceholder("Search by job title, description, company name, skills");
    // No accessible name (a bare icon span, components/Search/index.js) - same element serves as
    // the search trigger when idle and the "clear search" (x) trigger once a search is active,
    // mutually exclusive, so a class locator is unambiguous either way.
    this.searchIcon = page.locator(".search_end_icon");
    this.filterButton = page.getByRole("button", { name: "Filter" });
    this.filterPanelHeading = page.getByRole("heading", { name: "Filter", exact: true });
    this.applyFilterButton = page.getByRole("button", { name: "Apply Filter" });
    this.jobCards = page.locator("main").getByRole("heading", { level: 6 });
    this.applyNowButton = page.getByRole("button", { name: "Apply Now" });
    this.saveJobButton = page.getByRole("button", { name: "Save", exact: true });
    this.savedJobButton = page.getByRole("button", { name: "Saved", exact: true });
    this.removeJobButton = page.getByRole("button", { name: "Remove" });
    this.resultsCount = page.getByText(/Showing \d+ - \d+ of \d+ Jobs/);
    this.jobDescriptionHeading = page.getByRole("heading", { name: "Job Description" });
  }

  /** Plain navigation for UI-only checks that don't need to re-validate the API call. */
  async goto() {
    await this.page.goto("/professional/jobs/all_jobs");
    await expect(this.allJobsTab).toBeVisible();
  }

  /** Pass `action` (e.g. clicking the "Jobs" nav link) to trigger the navigation that loads
   * this page instead of a fresh page.goto(). */
  async waitForLoad(action = () => this.page.goto("/professional/jobs/all_jobs")) {
    const data = await waitForApiData(this.page, /\/professional_dashboard/, action);

    expect(typeof data.total_count).toBe("number");
    expect(Array.isArray(data.job_details)).toBe(true);
    expect(Array.isArray(data.job_type)).toBe(true);
    expect(Array.isArray(data.location)).toBe(true);
    expect(Array.isArray(data.sector)).toBe(true);
    expect(Array.isArray(data.specialisation)).toBe(true);

    for (const job of data.job_details) {
      expect(job).toHaveProperty("id");
      expect(typeof job.job_title).toBe("string");
      expect(job.job_title.length).toBeGreaterThan(0);
      expect(job).toHaveProperty("company_name");
      expect(job).toHaveProperty("job_type");
      expect(job).toHaveProperty("workplace_type");
      expect(job).toHaveProperty("applied_status");
      expect(job).toHaveProperty("saved_status");
    }

    return data;
  }

  async checkPageElements() {
    await expect(this.allJobsTab).toBeVisible();
    await expect(this.recommendedTab).toBeVisible();
    await expect(this.appliedTab).toBeVisible();
    await expect(this.savedTab).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.filterButton).toBeVisible();
  }

  /** This test account has 0 AI-matched jobs, so no listing endpoint call fires at all here. */
  async goToRecommendedTab() {
    await this.recommendedTab.click();
    await this.page.waitForURL(/\/recommended_jobs/);
    await expect(this.page.getByText(/Showing \d+ Jobs?/)).toBeVisible();
  }

  async goToAppliedTab() {
    const data = await waitForApiData(this.page, /\/professional_applied_jobs/, () => this.appliedTab.click());
    return this._checkTabListing(data);
  }

  async goToSavedTab() {
    const data = await waitForApiData(this.page, /\/professional_saved_jobs/, () => this.savedTab.click());
    return this._checkTabListing(data);
  }

  /** Applied/Saved return `data: {}` when there are none, or a plain array of job objects when
   * there are some - confirmed live for Saved: a single saved job came back as `data: [...]`
   * directly, not wrapped in a `job_details` key the way the All Jobs dashboard shapes it.
   * Normalizes to an array either way (also tolerating a `{job_details: [...]}` shape, in case
   * Applied ever differs) so callers never need to know which one came back. */
  _checkTabListing(data) {
    const jobs = Array.isArray(data) ? data : Array.isArray(data?.job_details) ? data.job_details : [];
    for (const job of jobs) {
      expect(job).toHaveProperty("id");
      expect(typeof job.job_title).toBe("string");
      expect(job.job_title.length).toBeGreaterThan(0);
    }
    if (jobs.length === 0) expect(typeof data).toBe("object");
    return jobs;
  }

  /** Clicks the first job card on All Jobs - opens its detail pane in the same page. */
  async openFirstJobDetail() {
    const data = await waitForApiData(this.page, /\/selected_job_details/, () => this.jobCards.first().click());
    const job = Array.isArray(data) ? data[0] : data;

    expect(job).toHaveProperty("job_id");
    expect(typeof job.job_title).toBe("string");
    expect(job.job_title.length).toBeGreaterThan(0);
    expect(["not_applied", "applied"]).toContain(job.applied_status);
    expect(["saved", "unsaved"]).toContain(job.saved_status);
    return job;
  }

  /** Verifies the detail pane shows the given job's title plus its action buttons - doesn't
   * click Apply Now/Save, since Apply Now submits a real application to a real employer. */
  async checkJobDetailPane(jobTitle) {
    await expect(this.page.getByRole("heading", { name: jobTitle, exact: true }).first()).toBeVisible();
    await expect(this.jobDescriptionHeading).toBeVisible();
    await expect(this.applyNowButton).toBeVisible();
    await expect(this.saveJobButton).toBeVisible();
  }

  /**
   * Types a query character-by-character (pressSequentially, not fill - real typing, matches
   * an actual person and is watchable in the video), then presses Enter to run it. Confirmed
   * live against components/Search/index.js: typing alone only updates local state - a search
   * only actually fires on Enter or a click on the search icon (both call the same handler), and
   * it hits POST /admin_jobs_meilisearch (services/professional/index.js
   * handle_get_mellie_search_jobs) - a different endpoint than the initial listing's
   * /professional_dashboard. Restores the original unfiltered listing afterward by clicking the
   * same icon, now showing its "clear search" (x) state, which goes back through
   * /professional_dashboard (clear_search_function) - so later tests in this journey see the
   * full list.
   */
  async searchFor(query) {
    const initialCount = await this._resultsTotal();

    await waitForApiData(this.page, /\/admin_jobs_meilisearch/, async () => {
      await this.searchInput.pressSequentially(query, { delay: 90 });
      await this.searchInput.press("Enter");
    });
    const filteredCount = await this._resultsTotal();

    await waitForApiData(this.page, /\/professional_dashboard/, () => this.searchIcon.click());
    const restoredCount = await this._resultsTotal();

    return { initialCount, filteredCount, restoredCount };
  }

  async _resultsTotal() {
    const text = (await this.resultsCount.textContent()) || "";
    const match = text.match(/of (\d+) Jobs/);
    expect(match, `couldn't parse a job count out of "${text}"`).toBeTruthy();
    return Number(match[1]);
  }

  /** Opens the Filter panel, verifies every field is present, then closes it via Apply Filter
   * (with nothing selected, so the listing itself is unaffected) rather than leaving it open.
   * Apply Filter always goes through the same mellie-search endpoint as searchFor() above
   * (services/professional/index.js mellie_search_function("apply_filter") -> POST
   * /admin_jobs_meilisearch), confirmed live, even with no filters chosen. */
  async checkFilterPanel() {
    await this.filterButton.click();
    await expect(this.filterPanelHeading).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Industry" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Functional Specialization" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Country" })).toBeVisible();
    await expect(this.page.getByText("City", { exact: true })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Job Type" })).toBeVisible();

    await waitForApiData(this.page, /\/admin_jobs_meilisearch/, () => this.applyFilterButton.click());
    await expect(this.filterPanelHeading).toBeHidden();
  }

  /**
   * Saving a job is real, persistent account state (confirmed live: the "Save" button becomes
   * a disabled "Saved" status, not a toggle - unsaving only works from the Saved tab's "Remove"
   * button, which is a distinct endpoint - POST /unsave_job - from the one Save itself uses).
   * This exercises the full cycle and restores the account to its original state (nothing saved)
   * before returning, so it's safe to run on every CI push. Call with a job's detail pane already
   * open (e.g. right after openFirstJobDetail()).
   */
  async saveThenRemoveJob(jobTitle) {
    await waitForApiData(this.page, /\/professional_job_save/, () => this.saveJobButton.click());
    await expect(this.savedJobButton).toBeVisible();

    const savedJobs = await this.goToSavedTab();
    expect(savedJobs.some((job) => job.job_title === jobTitle)).toBe(true);

    await waitForApiData(this.page, /\/unsave_job/, () => this.removeJobButton.first().click());

    await this.allJobsTab.click();
    await this.page.waitForURL(/\/all_jobs/);
  }
}

module.exports = { ProfessionalJobsPage };
