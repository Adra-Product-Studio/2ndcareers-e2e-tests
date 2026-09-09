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

  async gotoAndLoad() {
    const data = await waitForApiData(this.page, /\/professional_discourse_community/, () =>
      this.page.goto("/professional/community")
    );

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(Array.isArray(data[0].posts)).toBe(true);

    await expect(this.joinConversationButton).toBeVisible();
    return data;
  }
}

module.exports = { ProfessionalCommunityPage };
