// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * /professional/community. Loads via GET /professional_discourse_community - captured live,
 * see e2e-tests/README.md. Its `data` is an array containing one `{ posts: [] }` object.
 */
class ProfessionalCommunityPage {
  constructor(page) {
    this.page = page;
    this.joinConversationButton = page.getByRole("button", { name: "Join the Conversation" });
  }

  /** Pass `action` (e.g. clicking the home dashboard's COMMUNITY card) to trigger the
   * navigation that loads this page instead of a fresh page.goto(). */
  async waitForLoad(action = () => this.page.goto("/professional/community")) {
    const data = await waitForApiData(this.page, /\/professional_discourse_community/, action);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(Array.isArray(data[0].posts)).toBe(true);

    await expect(this.joinConversationButton).toBeVisible();
    return data;
  }
}

module.exports = { ProfessionalCommunityPage };
