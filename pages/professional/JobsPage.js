// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * /professional/jobs/all_jobs. Loads via POST /professional_dashboard - captured live,
 * see e2e-tests/README.md. Same endpoint backs the tabbed "Recommended"/"Applied"/"Saved"
 * views (different request body), so this only exercises the default "All Jobs" tab.
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
  }

  /** Plain navigation for UI-only checks that don't need to re-validate the API call. */
  async goto() {
    await this.page.goto("/professional/jobs/all_jobs");
    await expect(this.allJobsTab).toBeVisible();
  }

  async gotoAndLoad() {
    const data = await waitForApiData(this.page, /\/professional_dashboard/, () =>
      this.page.goto("/professional/jobs/all_jobs")
    );

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
}

module.exports = { ProfessionalJobsPage };
