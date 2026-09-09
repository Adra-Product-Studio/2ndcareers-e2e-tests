// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiDataMulti } = require("../../support/apiEnvelope");

/**
 * /professional/home. Loads via GET /professional_updated_home (dashboard content) and
 * GET /professional_notifications (bell dropdown) - both captured live, see e2e-tests/README.md.
 */
class ProfessionalHomePage {
  constructor(page) {
    this.page = page;
    this.pathwaysHeading = page.getByRole("heading", { name: "2nd Career Pathways" });
  }

  /** Plain navigation for UI-only checks that don't need to re-validate the API calls. */
  async goto() {
    await this.page.goto("/professional/home");
    await expect(this.pathwaysHeading).toBeVisible();
  }

  /** Navigates fresh and validates both of the page's own API calls in one pass. */
  async gotoAndLoad() {
    const [homeData, notifications] = await waitForApiDataMulti(
      this.page,
      [/\/professional_updated_home/, /\/professional_notifications/],
      () => this.page.goto("/professional/home")
    );

    const home = Array.isArray(homeData) ? homeData[0] : homeData;
    expect(typeof home.user_name).toBe("string");
    expect(home.user_name.length).toBeGreaterThan(0);
    expect(typeof home.profile_percentage).toBe("number");
    expect(Array.isArray(home.applied_jobs)).toBe(true);
    expect(Array.isArray(home.learning_posts)).toBe(true);
    expect(Array.isArray(home.community_list)).toBe(true);

    expect(Array.isArray(notifications)).toBe(true);
    for (const item of notifications) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("msg");
      expect(item).toHaveProperty("created_at");
      expect(item).toHaveProperty("view_status");
    }

    await expect(this.pathwaysHeading).toBeVisible();
    return { home, notifications };
  }

  async checkCards() {
    // exact: true throughout this method - several cards are themselves role="button" divs
    // wrapping a heading/paragraph/inner button, so their computed accessible name is the
    // concatenation of ALL of that nested text (e.g. the Career Copilots card's name includes
    // its own "Get Started" button text) - a substring match would hit the wrapper too.
    await expect(this.page.getByRole("button", { name: "2nd Careers in Impact", exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "AI for Boards", exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Complete profile", exact: true })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Latest Jobs" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Explore jobs", exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Apply", exact: true }).first()).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "2C Copilots" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Get Started", exact: true })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "2C Atlas" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "2C Upskill" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "2C Exchange" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Founders' Message" })).toBeVisible();
    await expect(this.page.getByText("Take a tour of our platform")).toBeVisible();
  }
}

module.exports = { ProfessionalHomePage };
