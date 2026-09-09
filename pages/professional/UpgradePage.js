// @ts-check
const { expect } = require("@playwright/test");

/**
 * /professional/upgrade (reached from the header's profile dropdown - "Upgrade"). Static
 * pricing content - no page-specific data call, all three tiers currently show "Coming Soon".
 */
class ProfessionalUpgradePage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Pricing plan" });
    this.basicTier = page.getByRole("heading", { name: "Basic", exact: true });
    this.premiumTier = page.getByRole("heading", { name: "Premium", exact: true });
    this.platinumTier = page.getByRole("heading", { name: "Platinum", exact: true });
    this.comingSoonButtons = page.getByRole("button", { name: "Coming Soon" });
  }

  async goto() {
    await this.page.goto("/professional/upgrade");
    await expect(this.heading).toBeVisible();
  }

  async checkTiers() {
    await expect(this.basicTier).toBeVisible();
    await expect(this.premiumTier).toBeVisible();
    await expect(this.platinumTier).toBeVisible();
    await expect(this.comingSoonButtons).toHaveCount(3);
  }
}

module.exports = { ProfessionalUpgradePage };
