// @ts-check
const { expect } = require("@playwright/test");
const { mockApiField, clearMock } = require("../../../support/mockResponse");
const { reapplyChatbotGuard } = require("../../../support/chatbotGuard");

const USAGE_ENDPOINT = /\/professional_job_recommendation_usage/;

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

  /** Pass `action` (e.g. clicking the Agents hub's "Get Started" link) to trigger the navigation
   * that loads this page instead of a fresh page.goto(). */
  async goto(action = () => this.page.goto("/professional/2c_agent/career_copilots")) {
    await action();
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

  /**
   * Actually picks a mode, not just opening/closing the dropdown - components/Button/
   * ChatbotSelect.jsx's own toggle button relabels itself to whatever was picked (confirmed
   * live), all local state (copilot_type/nested_parent), nothing fetched or persisted. "2c
   * Agents" is a PARENT with its own 3-item submenu (Standard/Balanced/Advanced) - clicking it
   * only expands that submenu without picking anything or closing the dropdown (confirmed live,
   * ChatbotSelect's handleSelect: an option with `children` only calls setActiveParent, never
   * onChange); the toggle only updates once a real (leaf) option is clicked, and for a nested
   * pick reads "<parent> (<child>) ▾" (is_nested format), not just the child's own label.
   * Restores back to Quick Search at the end - the default this account's next real search
   * (elsewhere in this suite) assumes.
   */
  async checkModeSelectionActuallyChangesMode() {
    await this.modeDropdownButton.click();
    await this.responseApiOption.click();
    await expect(this.page.getByRole("button", { name: "Response Api ▾", exact: true })).toBeVisible();

    await this.page.getByRole("button", { name: "Response Api ▾", exact: true }).click();
    await this.agentsOption.click();
    const standardOption = this.page.getByRole("button", { name: "Standard", exact: true });
    await expect(standardOption).toBeVisible();
    // Still open, nothing picked yet - clicking a parent with children only expands its submenu.
    await expect(this.page.getByRole("button", { name: /2c Agents \(/ })).toBeHidden();

    await standardOption.click();
    const nestedToggle = this.page.getByRole("button", { name: "2c Agents (Standard) ▾", exact: true });
    await expect(nestedToggle).toBeVisible();

    await nestedToggle.click();
    await this.quickSearchOption.click();
    await expect(this.modeDropdownButton).toBeVisible();
  }

  /**
   * remaining_runs === 0 (components/reusable_page/career_copilots) replaces the jobs panel with
   * "Limit has been reached" - forced the same way this suite reaches every other otherwise-
   * unreachable state: intercepting this page's own real GET /professional_job_recommendation_usage
   * response (confirmed live - services/professional/index.js, `data.data.remaining` feeds
   * remaining_runs directly) rather than actually burning this account's real limited runs down
   * to zero. NOTE (found via code, not tested here): remaining_runs === 0 alone isn't the real
   * condition - it's `remaining_runs === 0 && !state.show_jobs`, so a search that already
   * rendered jobs before the account's last run was spent would keep showing those jobs instead
   * of this message even once truly exhausted; reproducing THAT combination would require an
   * actual spent search first, which this suite deliberately never does (see class doc comment).
   */
  async checkPaywallWhenNoRunsRemaining() {
    await this.page.unrouteAll({ behavior: "ignoreErrors" });
    await mockApiField(this.page, USAGE_ENDPOINT, (json) => {
      json.data.remaining = 0;
      return json;
    });

    const [response] = await Promise.all([this.page.waitForResponse(USAGE_ENDPOINT, { timeout: 30_000 }), this.page.reload()]);
    expect(response.ok()).toBe(true);
    await reapplyChatbotGuard(this.page);

    await expect(this.runsRemainingText).toHaveText("Runs Remaining: 0");
    await expect(this.page.getByRole("heading", { name: "Limit has been reached" })).toBeVisible();
    await expect(this.messageInput).toBeDisabled();

    await clearMock(this.page, USAGE_ENDPOINT);
    // Back to this account's real remaining count for anything that runs after this - leave no
    // mocked state (even a cleared one) sitting on an already-rendered page.
    const [restore] = await Promise.all([this.page.waitForResponse(USAGE_ENDPOINT, { timeout: 30_000 }), this.page.reload()]);
    expect(restore.ok()).toBe(true);
    await reapplyChatbotGuard(this.page);
    await expect(this.naviHeading).toBeVisible();
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
