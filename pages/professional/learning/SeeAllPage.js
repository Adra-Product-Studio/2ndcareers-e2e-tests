// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../../support/apiEnvelope");

/**
 * /professional/learning/see_all?q=<recording|resources|perspectives>. A single page component
 * (app/(routes)/professional/learning/see_all/page.js) that dispatches its whole content on the
 * `q` query param via a PAGE_CONFIG map - any other value (or a missing one) redirects straight
 * back to /professional/learning (confirmed in code, `see_all/page.js:186-193`).
 */
class ProfessionalSeeAllPage {
  constructor(page) {
    this.page = page;
    this.backToLearningsButton = page.getByRole("button", { name: /Back to Learnings/ });
    this.marketplaceFeaturedListingsHeading = page.getByRole("heading", { name: "Featured Listings" });
  }

  /** An invalid/missing `q` never renders this page's own content at all - it bounces straight
   * back to the marketplace, so this is checked by URL + a marketplace-only heading, not by the
   * see_all page's own content. */
  async gotoWithInvalidQuery() {
    await this.page.goto("/professional/learning/see_all?q=not_a_real_mode");
    await this.page.waitForURL(/\/professional\/learning$/);
    await expect(this.marketplaceFeaturedListingsHeading).toBeVisible();
  }

  async gotoWithMissingQuery() {
    await this.page.goto("/professional/learning/see_all");
    await this.page.waitForURL(/\/professional\/learning$/);
    await expect(this.marketplaceFeaturedListingsHeading).toBeVisible();
  }
}

module.exports = { ProfessionalSeeAllPage };
