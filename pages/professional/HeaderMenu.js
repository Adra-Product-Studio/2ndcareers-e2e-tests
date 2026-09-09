// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * The professional section's shared header, present with the same structure on every
 * /professional/* page: notification bell, the hamburger that opens top-level nav
 * (Home/Jobs/Learning/2C Agents/Community), and the profile dropdown's sign-out link.
 * Selectors captured by live-driving the real app - see e2e-tests/README.md.
 */
class HeaderMenu {
  constructor(page) {
    this.page = page;
    this.headerButtons = page.getByRole("banner").getByRole("button");
    this.notificationsButton = this.headerButtons.first();
    this.navMenuButton = this.headerButtons.last();
    this.profileMenuButton = this.headerButtons.filter({ has: page.getByAltText("user image") });
    this.myProfileLink = page.getByRole("link", { name: "My Profile" });
    this.upgradeLink = page.getByRole("link", { name: "Upgrade" });
    this.helpLink = page.getByRole("link", { name: "Help" });
    this.getSupportLink = page.getByRole("link", { name: "Get Support" });
    this.signOutLink = page.getByRole("link", { name: "Sign out" });
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

  async openNavMenu() {
    await this.navMenuButton.click();
  }

  async goToSection(linkName) {
    await this.openNavMenu();
    await this.page.getByRole("link", { name: linkName, exact: true }).click();
  }

  async openProfileMenu() {
    await this.profileMenuButton.click();
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
