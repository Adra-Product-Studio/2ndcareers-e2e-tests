// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * /professional/2c_agent. This landing page has no data call of its own - it only reuses the
 * header's GET /user_dashboard_details (captured live, see e2e-tests/README.md) - the two
 * cards ("Job Scout"/"Rebuild your resume") link out to their own sub-flows.
 */
class ProfessionalAgentsPage {
  constructor(page) {
    this.page = page;
    this.jobScoutHeading = page.getByRole("heading", { name: "Job Scout" });
    this.jobScoutGetStartedLink = page.getByRole("link", { name: "Get Started" });
    this.rebuildResumeHeading = page.getByRole("heading", { name: "Rebuild your resume" });
    this.rebuildLink = page.getByRole("link", { name: "Rebuild" });
  }

  /** Plain navigation for UI-only checks that don't need to re-validate the API call. */
  async goto() {
    await this.page.goto("/professional/2c_agent");
    await expect(this.jobScoutHeading).toBeVisible();
  }

  async gotoAndLoad() {
    const data = await waitForApiData(this.page, /\/user_dashboard_details/, () =>
      this.page.goto("/professional/2c_agent")
    );

    expect(typeof data.notification_count).toBe("number");
    expect(Array.isArray(data.user_details)).toBe(true);

    await expect(this.jobScoutHeading).toBeVisible();
    await expect(this.rebuildResumeHeading).toBeVisible();
    return data;
  }

  async checkCards() {
    await expect(this.jobScoutGetStartedLink).toHaveAttribute("href", "/professional/2c_agent/career_copilots");
    await expect(this.rebuildLink).toHaveAttribute("href", "/professional/2c_agent/rebuild_resume");
  }

  /**
   * /professional/2c_agent/career_copilots - an AI chat tool with a metered "Runs Remaining"
   * quota per account. This only checks the page loads; it never submits a search, since that
   * would consume one of the account's limited runs on every test run.
   */
  async checkCareerCopilotsPage() {
    await this.page.goto("/professional/2c_agent/career_copilots");
    await expect(this.page.getByRole("heading", { name: "Navi", exact: true })).toBeVisible();
    await expect(this.page.getByPlaceholder("Describe the jobs you're looking for...")).toBeVisible();
    await expect(this.page.getByText(/Runs Remaining: \d+/)).toBeVisible();
  }

  /**
   * /professional/2c_agent/rebuild_resume - as of this writing the "Rebuild" link on the 2C
   * Agents landing page 404s (confirmed by clicking the real link, not just direct navigation).
   * This asserts the CORRECT behavior (the page should load), so it will fail until that route
   * is fixed - that's intentional, it's flagging a real bug rather than a test bug.
   */
  async checkRebuildResumeLinkWorks() {
    await this.goto();
    const [response] = await Promise.all([this.page.waitForResponse(/\/rebuild_resume/), this.rebuildLink.click()]);
    expect(response.status(), "the Rebuild link on /professional/2c_agent leads to a 404").toBeLessThan(400);
  }
}

module.exports = { ProfessionalAgentsPage };
