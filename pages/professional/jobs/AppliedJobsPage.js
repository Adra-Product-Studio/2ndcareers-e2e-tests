// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../../support/apiEnvelope");

/**
 * /professional/jobs/applied_jobs. Loads via POST /professional_applied_jobs - `data: {}` when
 * there are none (confirmed live; this account currently has none, since the only safe Apply Now
 * path never actually submits an application - see AllJobsPage.checkApplyGatedByIncompleteProfile).
 * Search hits the server (POST /search_result_applied), unlike Recommended's local filter.
 */
class ProfessionalAppliedJobsPage {
  constructor(page) {
    this.page = page;
    this.appliedTab = page.getByRole("link", { name: "Applied" });
    this.searchInput = page.getByPlaceholder("Search by job title, description, company name, skills");
    this.searchIcon = page.locator(".search_end_icon");
    // The API response's own `message` field says "You haven't applied for any jobs" - the UI
    // itself just renders the shared JobNotFoundCard's generic "No Data Available" (confirmed live).
    this.noDataText = page.getByText("No Data Available");
  }

  async goto() {
    await this.page.goto("/professional/jobs/applied_jobs");
    await expect(this.appliedTab).toBeVisible();
  }

  async waitForLoad(action = () => this.goto()) {
    const data = await waitForApiData(this.page, /\/professional_applied_jobs/, action);
    const jobs = this._normalize(data);
    await expect(this.appliedTab).toBeVisible();
    return jobs;
  }

  _normalize(data) {
    const jobs = Array.isArray(data) ? data : Array.isArray(data?.job_details) ? data.job_details : [];
    for (const job of jobs) {
      expect(job).toHaveProperty("id");
      expect(typeof job.job_title).toBe("string");
    }
    return jobs;
  }

  /** No applied jobs exist for this account (see class doc comment), so the empty state is the
   * only reachable, verifiable branch here - a real search with 0 rows to match against. */
  async checkEmptyState() {
    await expect(this.noDataText).toBeVisible();
  }

  /** A server-backed search (POST /search_result_applied) - still fires (and still returns the
   * same empty envelope) even with 0 applied jobs, so this exercises the real request/response
   * cycle without depending on any actual applied job existing. */
  async searchFor(query) {
    return waitForApiData(this.page, /\/search_result_applied/, async () => {
      await this.searchInput.pressSequentially(query, { delay: 90 });
      await this.searchInput.press("Enter");
    });
  }
}

module.exports = { ProfessionalAppliedJobsPage };
