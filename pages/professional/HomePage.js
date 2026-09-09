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
    this.communityCard = page.getByRole("button", { name: /COMMUNITY/ });
  }

  /** Plain navigation for UI-only checks that don't need to re-validate the API call. */
  async goto() {
    await this.page.goto("/professional/home");
    await expect(this.pathwaysHeading).toBeVisible();
  }

  /**
   * Validates the page's own API calls in one pass. With no `action` (a fresh page.goto()),
   * this ALSO validates GET /user_dashboard_details - the header's user-info call, which only
   * fires once per app session because the header lives in a persistent layout that doesn't
   * remount on same-section client navigation (confirmed live). That makes a real page.goto()
   * the only reliable place to catch it, so the very first Home visit of a journey is where
   * it's checked; pass an `action` (e.g. a nav-link click) for a lighter, page-data-only check
   * on later returns to Home.
   */
  async waitForLoad(action) {
    const patterns = action
      ? [/\/professional_updated_home/, /\/professional_notifications/]
      : [/\/professional_updated_home/, /\/professional_notifications/, /\/user_dashboard_details/];

    const results = await waitForApiDataMulti(this.page, patterns, action || (() => this.page.goto("/professional/home")));
    const [homeData, notifications, userDetails] = results;

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

    if (userDetails) {
      expect(typeof userDetails.notification_count).toBe("number");
      expect(Array.isArray(userDetails.user_details)).toBe(true);
      expect(userDetails.user_details[0]).toHaveProperty("email_id");
      expect(userDetails.user_details[0].user_role).toBe("professional");
    }

    await expect(this.pathwaysHeading).toBeVisible();
    return { home, notifications, userDetails };
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

  /**
   * The home dashboard's "COMMUNITY" quick-access card opens https://app.2ndcareers.com in a
   * NEW TAB (verified live via browser_tabs - not an in-app route, despite looking like one).
   * There's currently no click path left to the internal /professional/community page (the top
   * nav's "Community" link is also external) - it still exists and loads fine by direct URL,
   * but isn't part of any real click-driven journey any more, so it's not covered here.
   * This catches the popup instead of following it, leaving the main page/session untouched.
   */
  async checkCommunityCardOpensExternalApp() {
    const [popup] = await Promise.all([this.page.waitForEvent("popup"), this.communityCard.click()]);
    await popup.waitForLoadState();
    expect(popup.url()).toContain("app.2ndcareers.com");
    await popup.close();
  }
}

module.exports = { ProfessionalHomePage };
