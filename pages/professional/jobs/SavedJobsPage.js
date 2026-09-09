// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../../support/apiEnvelope");

/**
 * /professional/jobs/saved_jobs. Loads via POST /professional_saved_jobs - `data: {}` when
 * empty, or a plain array of job objects when not (confirmed live - NOT wrapped in a
 * `job_details` key the way the All Jobs dashboard shapes it). Search hits the server
 * (POST /search_result_saved). The actual Save -> Remove mutation cycle lives in
 * AllJobsPage.saveThenRemoveJob() since it starts from a job opened on the All Jobs tab; this
 * page object covers this tab's own load/search/empty-state behavior in isolation.
 */
class ProfessionalSavedJobsPage {
  constructor(page) {
    this.page = page;
    this.savedTab = page.getByRole("link", { name: "Saved" });
    this.searchInput = page.getByPlaceholder("Search by job title, description, company name, skills");
    // The API response's own `message` field says "You haven't saved any jobs" - the UI itself
    // just renders the shared JobNotFoundCard's generic "No Data Available" (confirmed live).
    this.noDataText = page.getByText("No Data Available");
    this.removeJobButton = page.getByRole("button", { name: "Remove" });
  }

  async goto() {
    await this.page.goto("/professional/jobs/saved_jobs");
    await expect(this.savedTab).toBeVisible();
  }

  async waitForLoad(action = () => this.goto()) {
    const data = await waitForApiData(this.page, /\/professional_saved_jobs/, action);
    return this._normalize(data);
  }

  _normalize(data) {
    const jobs = Array.isArray(data) ? data : Array.isArray(data?.job_details) ? data.job_details : [];
    for (const job of jobs) {
      expect(job).toHaveProperty("id");
      expect(typeof job.job_title).toBe("string");
    }
    return jobs;
  }

  async checkEmptyState() {
    await expect(this.noDataText).toBeVisible();
  }

  async searchFor(query) {
    return waitForApiData(this.page, /\/search_result_saved/, async () => {
      await this.searchInput.pressSequentially(query, { delay: 90 });
      await this.searchInput.press("Enter");
    });
  }
}

module.exports = { ProfessionalSavedJobsPage };
