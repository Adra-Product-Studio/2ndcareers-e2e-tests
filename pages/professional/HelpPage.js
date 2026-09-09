// @ts-check
const { expect } = require("@playwright/test");

/**
 * /professional/help (reached from the header's profile dropdown - "Help"). A list of embedded
 * YouTube walkthrough videos - no page-specific data call to validate.
 */
class ProfessionalHelpPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Help videos" });
    this.videoIframes = page.locator("iframe");
  }

  /** Pass `action` (e.g. clicking "Help" in the header's profile dropdown) to trigger the
   * navigation that loads this page instead of a fresh page.goto(). */
  async goto(action = () => this.page.goto("/professional/help")) {
    await action();
    await expect(this.heading).toBeVisible();
  }

  async checkVideos() {
    // The YouTube embeds mount asynchronously after the page loads - retry instead of a single
    // point-in-time count() so this doesn't race a still-empty DOM.
    await expect
      .poll(async () => this.videoIframes.count(), { timeout: 15000 })
      .toBeGreaterThan(0);
  }
}

module.exports = { ProfessionalHelpPage };
