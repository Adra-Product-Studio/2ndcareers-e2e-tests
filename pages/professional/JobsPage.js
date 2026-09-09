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
    this.filterButton = page.getByRole("button", { name: "Filter" });
    this.jobCards = page.locator("main").getByRole("heading", { level: 6 });
    this.applyNowButton = page.getByRole("button", { name: "Apply Now" });
    this.saveJobButton = page.getByRole("button", { name: "Save", exact: true });
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
    this._checkTabListing(data);
    return data;
  }

  async goToSavedTab() {
    const data = await waitForApiData(this.page, /\/professional_saved_jobs/, () => this.savedTab.click());
    this._checkTabListing(data);
    return data;
  }

  /** Applied/Saved return `data: {}` when there are none, or `{job_details: [...]}` otherwise. */
  _checkTabListing(data) {
    if (Array.isArray(data.job_details)) {
      for (const job of data.job_details) {
        expect(job).toHaveProperty("id");
        expect(typeof job.job_title).toBe("string");
        expect(job.job_title.length).toBeGreaterThan(0);
      }
    } else {
      expect(typeof data).toBe("object");
    }
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
}

module.exports = { ProfessionalJobsPage };
