// @ts-check
const { expect } = require("@playwright/test");

/**
 * /professional/2c_agent/career_copilots. An AI chat tool (components/reusable_page/career_copilots)
 * with a metered "Runs Remaining" quota per account - confirmed live, this account currently has
 * only 3 runs left. Every check here is deliberately non-consuming: mode selection, the profile
 * checkbox, and sending an empty message are all pure client-side state (confirmed live - sending
 * empty fires no request and leaves Runs Remaining unchanged), so they're safe to run on every CI
 * push. A real search (any non-empty message) is NOT exercised here - that would burn one of the
 * account's limited runs on every push.
 */
class ProfessionalCareerCopilotsPage {
  constructor(page) {
    this.page = page;
    this.naviHeading = page.getByRole("heading", { name: "Navi", exact: true });
    this.messageInput = page.getByPlaceholder("Describe the jobs you're looking for...");
    // The toggle button's own label includes the caret ("Quick Search ▾"); once open, one of the
    // options inside the dropdown is also named exactly "Quick Search" (no caret) - a loose
    // regex on either matches both and throws a strict-mode violation, so match the toggle by
    // its exact full label instead.
    this.modeDropdownButton = page.getByRole("button", { name: "Quick Search ▾" });
    this.quickSearchOption = page.getByRole("button", { name: "Quick Search", exact: true });
    this.agentsOption = page.getByRole("button", { name: /2c Agents/ });
    this.responseApiOption = page.getByRole("button", { name: "Response Api" });
    this.profileCheckbox = page.getByRole("checkbox", { name: "Find Jobs Based on My Profile" });
    this.runsRemainingText = page.getByText(/Runs Remaining: \d+/);
    this.noJobsYetHeading = page.getByRole("heading", { name: "No Jobs Yet" });
    this.jobCountText = page.getByText(/\d+ Jobs?/);
  }

  async goto() {
    await this.page.goto("/professional/2c_agent/career_copilots");
    await expect(this.naviHeading).toBeVisible();
  }

  async checkInitialState() {
    await expect(this.naviHeading).toBeVisible();
    await expect(this.messageInput).toBeVisible();
    await expect(this.runsRemainingText).toBeVisible();
    await expect(this.noJobsYetHeading).toBeVisible();
  }

  /** Opens the chatbot-type dropdown and confirms all 3 modes are listed, then closes it without
   * changing anything - purely a UI toggle, no request fires either way (confirmed live). */
  async checkModeDropdown() {
    await this.modeDropdownButton.click();
    await expect(this.quickSearchOption).toBeVisible();
    await expect(this.agentsOption).toBeVisible();
    await expect(this.responseApiOption).toBeVisible();
    await this.modeDropdownButton.click();
    await expect(this.quickSearchOption).toBeHidden();
  }

  /** A plain checkbox toggle - `profile_based_job` local state only, read by a search this test
   * never submits. */
  async checkProfileCheckboxToggles() {
    await expect(this.profileCheckbox).not.toBeChecked();
    await this.profileCheckbox.check();
    await expect(this.profileCheckbox).toBeChecked();
    await this.profileCheckbox.uncheck();
    await expect(this.profileCheckbox).not.toBeChecked();
  }

  /**
   * Sending requires a non-empty `user_message` (components/reusable_page/career_copilots) -
   * confirmed live: clicking Send with an empty input fires no request at all and leaves
   * "Runs Remaining" and the "No Jobs Yet" empty state completely unchanged.
   */
  async checkEmptyMessageIsBlocked() {
    const runsBefore = await this.runsRemainingText.textContent();
    await this.messageInput.press("Enter");
    await expect(this.runsRemainingText).toHaveText(runsBefore || "");
    await expect(this.noJobsYetHeading).toBeVisible();
  }
}

module.exports = { ProfessionalCareerCopilotsPage };
