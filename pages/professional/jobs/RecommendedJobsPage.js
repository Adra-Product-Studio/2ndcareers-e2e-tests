// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../../support/apiEnvelope");

/**
 * /professional/jobs/recommended_jobs. Distinct from the other 3 tabs in several ways (see
 * app/(routes)/professional/jobs/recommended_jobs/layout.js):
 *   - The listing endpoint (GET /professional_recommended) only fires at all when
 *     `profile_percentage > 60`; otherwise the page never calls it and shows a "complete your
 *     profile" prompt instead - confirmed live at this account's actual ~53% completion.
 *   - There's a documented boundary gap at exactly 60%: the fetch guard is `> 60` and the
 *     empty-state prompt guard is `< 60`, so at precisely 60 neither fires and the page falls
 *     through to a plain "no data" empty state instead of either the prompt or real jobs. Not
 *     testable with this single shared account (it would need one seeded at exactly 60%) - left
 *     as a documented gap rather than guessed at.
 *   - Search here is a LOCAL client-side filter (job_title substring match against an
 *     already-fetched copy), not a server call - unlike All Jobs/Applied/Saved.
 */
class ProfessionalRecommendedJobsPage {
  constructor(page) {
    this.page = page;
    this.recommendedTab = page.getByRole("link", { name: "Recommended" });
    this.searchInput = page.getByPlaceholder("Search by job title, description, company name, skills");
    this.resultsCount = page.getByText(/Showing \d+ Jobs?/);
    // .and(":visible") - confirmed on CI/staging this text renders as many duplicate elements (a
    // double-digit count, growing across runs - not just a fixed handful of responsive
    // breakpoint copies), almost all hidden; DOM order (.first()) doesn't reliably land on the
    // one actually shown, so this intersects the text match with actual visibility instead.
    this.completeProfilePrompt = page.getByText(/complete your profile to increase your chances/).and(page.locator(":visible"));
    this.completeProfileLink = page.getByRole("link", { name: "My Profile" }).and(page.locator(":visible"));
  }

  async goto() {
    await this.page.goto("/professional/jobs/recommended_jobs");
    // This page's gating condition reads profile_percentage from the header's own
    // /user_dashboard_details fetch (a session-level call, not this page's own) - occasionally
    // slower than the default assertion timeout under real backend load, confirmed live.
    await expect(this.resultsCount).toBeVisible({ timeout: 15000 });
  }

  /**
   * Below the 60% threshold (this account's real state), no API call fires at all - so this
   * only validates the UI's "complete your profile" gating rather than any endpoint. If this
   * account's profile is ever completed past 60%, this method's assumption breaks by design
   * (the assertions below would fail, flagging that the test needs updating for the new state).
   */
  async waitForLoadBelowThreshold(action = () => this.goto()) {
    await action();
    await expect(this.resultsCount).toHaveText("Showing 0 Jobs");
    // .first() on top of the constructor's :visible filter, in case more than one copy is
    // simultaneously visible for any reason - belt and braces against a strict-mode violation.
    await expect(this.completeProfilePrompt.first()).toBeVisible();
    await expect(this.completeProfileLink.first()).toHaveAttribute("href", "/professional/profile");
  }

  /** Local (client-side) filtering - no network call to wait for, just the UI updating. */
  async searchFor(query) {
    await this.searchInput.pressSequentially(query, { delay: 90 });
    await this.searchInput.press("Enter");
  }
}

module.exports = { ProfessionalRecommendedJobsPage };
