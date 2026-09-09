// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiDataMulti } = require("../../../support/apiEnvelope");

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
   * Validates every one of the page's own API calls in one pass, PLUS GET /user_dashboard_details
   * (the header's user-info call) - only true the very first time Home mounts in a session
   * (either a fresh page.goto(), or the redirect straight after login - see
   * tests/professional/01-login/01-login.spec.js, which is where this is actually exercised).
   * Confirmed live: returning to an already-visited route via a nav-link click later in the same
   * session can be served entirely from Next.js's client router cache with NO new matching
   * request at all, even though the page renders fully correct content - use checkAlreadyLoaded()
   * for that case instead of this one.
   */
  async waitForLoad(action = () => this.page.goto("/professional/home")) {
    const patterns = [/\/professional_updated_home/, /\/professional_notifications/, /\/user_dashboard_details/];
    const [homeData, notifications, userDetails] = await waitForApiDataMulti(this.page, patterns, action);

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

    expect(typeof userDetails.notification_count).toBe("number");
    expect(Array.isArray(userDetails.user_details)).toBe(true);
    expect(userDetails.user_details[0]).toHaveProperty("email_id");
    expect(userDetails.user_details[0].user_role).toBe("professional");

    await expect(this.pathwaysHeading).toBeVisible();
    return { home, notifications, userDetails };
  }

  /**
   * For returning to Home later in the same session (e.g. a header nav-link click from another
   * page) once it's already been loaded once - see waitForLoad()'s doc comment for why that
   * doesn't reliably produce a fresh, observable network call to wait on. Checks the rendered
   * content directly instead, including the SAME below-60%/above-30% conditional copy
   * waitForLoad()'s caller would otherwise have read out of the raw JSON (see
   * app/(routes)/professional/home/page.js's dynamic_profile_content/render_jobs_carousel).
   */
  async checkAlreadyLoaded(action) {
    if (action) await action();
    await expect(this.pathwaysHeading).toBeVisible();
    await this.checkCards();
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
