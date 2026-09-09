// @ts-check
const { expect } = require("@playwright/test");

/**
 * /professional/get_support. Fully static "Coming Soon" placeholder - no data fetch, no actions.
 * The header profile dropdown's real "Get Support" link actually opens an external URL, bypassing
 * this route entirely (confirmed in HeaderMenu.js), so this page is only reachable by direct URL
 * today - still worth testing since the route is live and could be linked to at any time.
 */
class ProfessionalGetSupportPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Get support Coming Soon!" });
  }

  async goto() {
    await this.page.goto("/professional/get_support");
    await expect(this.heading).toBeVisible();
  }
}

module.exports = { ProfessionalGetSupportPage };
