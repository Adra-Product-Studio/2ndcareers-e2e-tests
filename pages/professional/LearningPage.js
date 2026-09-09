// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * /professional/learning. Loads via GET /get_training_data - captured live, see
 * e2e-tests/README.md. Unlike the other endpoints this one nests its payload one level
 * deeper (`data.data`, an array of training/event postings) and reports success as
 * error_code 200 instead of 0 - both quirks are why apiEnvelope.js exists as shared code
 * instead of every page re-deriving its own "is this a success response" logic.
 */
class ProfessionalLearningPage {
  constructor(page) {
    this.page = page;
    this.featuredListingsHeading = page.getByRole("heading", { name: "Featured Listings" });
  }

  async gotoAndLoad() {
    const outer = await waitForApiData(this.page, /\/get_training_data/, () =>
      this.page.goto("/professional/learning")
    );

    expect(Array.isArray(outer.data)).toBe(true);
    for (const posting of outer.data) {
      expect(posting).toHaveProperty("id");
      expect(typeof posting.title).toBe("string");
      expect(posting.title.length).toBeGreaterThan(0);
      expect(posting).toHaveProperty("event_date_time");
      expect(posting).toHaveProperty("type_of_offering");
      expect(posting).toHaveProperty("payment_status");
    }

    await expect(this.featuredListingsHeading).toBeVisible();
    return outer.data;
  }
}

module.exports = { ProfessionalLearningPage };
