// @ts-check
const { expect } = require("@playwright/test");

/**
 * The public login page's own "New to 2nd Careers? Sign up now" link
 * (app/(routes)/(auth)/page.js) and the role selection page it leads to
 * (app/(routes)/(auth)/role_selection/page.js) - 3 cards (Professional/Employer/Partner) driven
 * by json/json_data/auth/index.js's `role_selection` array, each a real "Sign Up" button doing a
 * plain router.push to that role's own new_user_signup route.
 */
class RoleSelectionPage {
  constructor(page) {
    this.page = page;
    this.signInHeading = page.getByRole("heading", { name: "Sign in to 2nd Careers" });
    this.signUpNowLink = page.getByRole("link", { name: "Sign up now" });
    this.pageHeading = page.getByRole("heading", { name: "Select your desired pathway" });
    // Each card is a plain non-interactive <div> - only its own "Sign Up" button is a real
    // control - so a role is identified by scoping to the card containing that role's own
    // title heading, not by any per-card test id (there isn't one).
    this.roleCards = page.locator(".role_selection_card_shadow");
  }

  /** Starts from the public login page (not already there) and clicks through to role
   * selection - the one real in-app click path a person actually uses. */
  async goto() {
    await this.page.goto("/");
    await expect(this.signInHeading).toBeVisible();
    await this.signUpNowLink.click();
    await this.page.waitForURL(/\/role_selection$/);
    await expect(this.pageHeading).toBeVisible();
  }

  _cardFor(roleTitle) {
    return this.roleCards.filter({ has: this.page.getByRole("heading", { name: roleTitle, exact: true }) });
  }

  /**
   * Verifies all 3 real role cards (title, description, icon, Sign Up button) are present -
   * exact copy from json/json_data/auth/index.js's role_selection array, confirmed live rather
   * than assumed, so this fails loudly if the real marketing copy ever changes instead of
   * silently passing on stale text.
   */
  async checkAllRoleCards() {
    const expectedCards = [
      { title: "Professional", content: "Empowering experienced professionals with fulfilling opportunities." },
      { title: "Employer", content: "Enabling enterprises, start-ups, and NGOs to find curated, experienced talent" },
      { title: "Partner", content: "Building partnerships for skill development, recruitment and coaching." },
    ];
    expect(await this.roleCards.count()).toBe(expectedCards.length);
    for (const { title, content } of expectedCards) {
      const card = this._cardFor(title);
      await expect(card.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(card.getByText(content, { exact: true })).toBeVisible();
      await expect(card.locator("img").first()).toBeVisible();
      await expect(card.getByRole("button", { name: "Sign Up", exact: true })).toBeVisible();
    }
  }

  /** Clicks the Professional card's own Sign Up button - a real router.push, not a goto. */
  async chooseProfessional() {
    await this._cardFor("Professional").getByRole("button", { name: "Sign Up", exact: true }).click();
    await this.page.waitForURL(/\/role_selection\/professional_signup\/new_user_signup/);
  }
}

module.exports = { RoleSelectionPage };
