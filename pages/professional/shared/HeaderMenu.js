// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../../support/apiEnvelope");
const { dismissChatbotIfOpen } = require("../../../support/chatbot");

/**
 * The professional section's shared header, present with the same structure on every
 * /professional/* page: notification bell, top-level nav (Home/Jobs/Learning/2C Agents/
 * Community), and the profile dropdown. Selectors captured by live-driving the real app - see
 * e2e-tests/README.md.
 *
 * The 5 nav links each have a stable id (professional_nav_<name>_link) - required, because at
 * the default 1280x720 test viewport there's ALSO a hidden duplicate copy of the same links
 * (an off-canvas mobile nav, positioned off-screen rather than display:none, so it's still
 * "visible" by a naive check) - text/role locators alone match both and throw a strict-mode
 * violation. Clicking these is a real Next.js <Link> transition (verified live: a value stashed
 * on `window` before the click was still there after), not a full reload - use these instead of
 * page.goto() whenever the test is already logged in and just moving between top-level pages.
 */
class HeaderMenu {
  constructor(page) {
    this.page = page;
    this.headerButtons = page.getByRole("banner").getByRole("button");
    this.notificationsButton = this.headerButtons.first();
    this.notificationsPanelTitle = page.getByText("Notifications", { exact: true });
    this.clearAllButton = page.getByRole("button", { name: "Clear All" });
    this.profileMenuButton = this.headerButtons.filter({ has: page.getByAltText("user image") });
    this.homeNavLink = page.locator("#professional_nav_home_link");
    this.jobsNavLink = page.locator("#professional_nav_jobs_link");
    this.learningNavLink = page.locator("#professional_nav_learning_link");
    this.agentsNavLink = page.locator("#professional_nav_2c_agent_link");
    // Community's top-nav link goes off-app to an external discourse site - there's no in-app
    // page to click-navigate to from here (see pages/professional/HomePage.js for the internal
    // community page, reached via the home dashboard's own "COMMUNITY" quick-access card instead).
    this.myProfileLink = page.getByRole("link", { name: "My Profile" });
    this.upgradeLink = page.getByRole("link", { name: "Upgrade" });
    this.helpLink = page.getByRole("link", { name: "Help" });
    this.getSupportLink = page.getByRole("link", { name: "Get Support" });
    this.signOutLink = page.getByRole("link", { name: "Sign out" });
  }

  async goToHome() {
    await dismissChatbotIfOpen(this.page);
    await this.homeNavLink.click();
    await this.page.waitForURL(/\/professional\/home/);
  }

  async goToJobs() {
    await dismissChatbotIfOpen(this.page);
    await this.jobsNavLink.click();
    await this.page.waitForURL(/\/professional\/jobs/);
  }

  async goToLearning() {
    await dismissChatbotIfOpen(this.page);
    await this.learningNavLink.click();
    await this.page.waitForURL(/\/professional\/learning$/);
  }

  async goToAgents() {
    await dismissChatbotIfOpen(this.page);
    await this.agentsNavLink.click();
    await this.page.waitForURL(/\/professional\/2c_agent$/);
  }

  /** Opens the notification bell (a real toggle - verified live, the same button closes it
   * again, just with a brief animation delay), checks the panel content, then closes it. */
  async checkNotificationsPanel() {
    await this.notificationsButton.click();
    await expect(this.notificationsPanelTitle).toBeVisible();
    await expect(this.clearAllButton).toBeVisible();

    await this.notificationsButton.click();
    await expect(this.notificationsPanelTitle).toBeHidden();
  }

  /** GET /user_dashboard_details backs the notification count + avatar on every page. */
  async waitForUserDetails(action) {
    const data = await waitForApiData(this.page, /\/user_dashboard_details/, action);
    expect(typeof data.notification_count).toBe("number");
    expect(Array.isArray(data.user_details)).toBe(true);
    expect(data.user_details.length).toBeGreaterThan(0);
    const user = data.user_details[0];
    expect(user).toHaveProperty("email_id");
    expect(user).toHaveProperty("first_name");
    expect(user).toHaveProperty("user_role", "professional");
    return data;
  }

  /** Idempotent - the profile button toggles the dropdown (verified live), so this only clicks
   * it when the dropdown isn't already open, otherwise a second call would close it again. */
  async openProfileMenu() {
    await dismissChatbotIfOpen(this.page);
    const alreadyOpen = await this.myProfileLink.isVisible().catch(() => false);
    if (!alreadyOpen) {
      await this.profileMenuButton.click();
      await expect(this.myProfileLink).toBeVisible();
    }
  }

  /** Checks all 4 profile dropdown links + Sign out are present, without navigating. */
  async checkProfileMenuLinks() {
    await this.openProfileMenu();
    await expect(this.myProfileLink).toBeVisible();
    await expect(this.upgradeLink).toBeVisible();
    await expect(this.helpLink).toBeVisible();
    await expect(this.getSupportLink).toBeVisible();
    await expect(this.getSupportLink).toHaveAttribute("href", "https://forms.gle/dP4xqG1TfLZUBoyG6");
    await expect(this.signOutLink).toBeVisible();
  }

  /** Opens the profile dropdown and clicks one of My Profile / Upgrade / Help. */
  async goToProfileMenuLink(linkName) {
    await this.openProfileMenu();
    await this.page.getByRole("link", { name: linkName, exact: true }).click();
  }

  async signOut() {
    await this.checkProfileMenuLinks();
    await this.signOutLink.click();
    await this.page.waitForURL(/\/$/, { timeout: 15000 });
  }
}

module.exports = { HeaderMenu };
