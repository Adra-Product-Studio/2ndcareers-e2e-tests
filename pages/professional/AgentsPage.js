// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * /professional/2c_agent. This landing page has no data call of its own - it only reuses the
 * header's GET /user_dashboard_details. That call only fires once per app session though: the
 * header lives in a persistent Next.js layout that doesn't remount on a same-section
 * client-side navigation, so arriving here via a nav-link click (rather than a fresh
 * page.goto()) never re-triggers it - confirmed live, this page's own content still rendered
 * correctly while the wait for that response timed out. So waitForLoad() only requires the API
 * call on its default fresh-goto path; a click-based `action` is verified by UI content alone.
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

  /**
   * With no `action`, does a fresh page.goto() and validates the header's API call (fires on a
   * real load). Pass an `action` (e.g. clicking the "2C Agents" nav link) for click-based entry
   * instead - that call won't re-fire on a same-session client transition (see class doc
   * comment), so that path is verified by UI content only.
   */
  async waitForLoad(action) {
    if (!action) {
      const data = await waitForApiData(this.page, /\/user_dashboard_details/, () =>
        this.page.goto("/professional/2c_agent")
      );
      expect(typeof data.notification_count).toBe("number");
      expect(Array.isArray(data.user_details)).toBe(true);
      await expect(this.jobScoutHeading).toBeVisible();
      await expect(this.rebuildResumeHeading).toBeVisible();
      return data;
    }

    await action();
    await expect(this.jobScoutHeading).toBeVisible();
    await expect(this.rebuildResumeHeading).toBeVisible();
    return null;
  }

  async checkCards() {
    await expect(this.jobScoutGetStartedLink).toHaveAttribute("href", "/professional/2c_agent/career_copilots");
    await expect(this.rebuildLink).toHaveAttribute("href", "/professional/2c_agent/rebuild_resume");
  }

  /**
   * Clicks through to /professional/2c_agent/career_copilots - an AI chat tool with a metered
   * "Runs Remaining" quota per account. This only checks the page loads; it never submits a
   * search, since that would consume one of the account's limited runs on every test run.
   * Call this while already on the 2C Agents landing page (e.g. right after waitForLoad()).
   */
  async checkCareerCopilotsPage() {
    await this.jobScoutGetStartedLink.click();
    await this.page.waitForURL(/\/career_copilots/);
    await expect(this.page.getByRole("heading", { name: "Navi", exact: true })).toBeVisible();
    await expect(this.page.getByPlaceholder("Describe the jobs you're looking for...")).toBeVisible();
    await expect(this.page.getByText(/Runs Remaining: \d+/)).toBeVisible();
  }

  /**
   * Known bug, confirmed both locally and on staging: /professional/2c_agent/rebuild_resume
   * 404s. Asserts the CORRECT behavior (the page should load), so it fails until that route is
   * fixed - that's intentional, it's flagging a real bug rather than a test bug. Call this while
   * already on the 2C Agents landing page.
   */
  async checkRebuildResumeLinkWorks() {
    const [response] = await Promise.all([this.page.waitForResponse(/\/rebuild_resume/), this.rebuildLink.click()]);
    expect(response.status(), "the Rebuild link on /professional/2c_agent leads to a 404").toBeLessThan(400);
  }
}

module.exports = { ProfessionalAgentsPage };
