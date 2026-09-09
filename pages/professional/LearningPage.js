// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * /professional/learning. Loads via GET /get_training_data - captured live, see
 * e2e-tests/README.md. Unlike the other endpoints this one nests its payload one level deeper
 * (`data.data`, an array of training/event postings) and reports success as error_code 200
 * instead of 0 - both quirks are why apiEnvelope.js exists as shared code instead of every page
 * re-deriving its own "is this a success response" logic.
 *
 * The page has 6 sections, verified top to bottom by scrolling each into view first (matching
 * how a person actually finds them on a long page): Featured Listings, "Connect with Experts -
 * Stay Tuned!", Learn Live, On Demand, Resources, Perspectives.
 *
 * "Connect with Experts" and "Learn Live" each show a live "<N> Listings" count next to their
 * title - their own "See all N →" BUTTON only renders once N > 3 (verified live at 139 and 9
 * listings). That button doesn't go anywhere yet either way (verified live - clicking it is a
 * no-op), so this only checks its conditional visibility, not a destination.
 *
 * On Demand/Resources/Perspectives are different: their "See all N ..." is plain clickable text
 * (not a real link/button element) that navigates to /professional/learning/see_all?q=<recording|
 * resources|perspectives>, each with its own "<N> <items>" count and a "Back to Learnings" button.
 */
class ProfessionalLearningPage {
  constructor(page) {
    this.page = page;
    this.featuredListingsHeading = page.getByRole("heading", { name: "Featured Listings" });
    this.connectWithExpertsTitle = page.getByText("Connect with Experts - Stay Tuned!", { exact: true });
    this.learnLiveTitle = page.getByText("Learn Live", { exact: true });
    this.onDemandTitle = page.getByText("On Demand", { exact: true });
    this.resourcesTitle = page.getByText("Resources", { exact: true });
    this.perspectivesTitle = page.getByText("Perspectives", { exact: true });
    this.backToLearningsButton = page.getByRole("button", { name: /Back to Learnings/ });
  }

  /** Pass `action` (e.g. clicking the "Learning" nav link) to trigger the navigation that
   * loads this page instead of a fresh page.goto(). */
  async waitForLoad(action = () => this.page.goto("/professional/learning")) {
    const outer = await waitForApiData(this.page, /\/get_training_data/, action);

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

  /** Scrolls to and verifies every section title, top to bottom of the page. */
  async checkAllSectionTitles() {
    const titles = [
      this.featuredListingsHeading,
      this.connectWithExpertsTitle,
      this.learnLiveTitle,
      this.onDemandTitle,
      this.resourcesTitle,
      this.perspectivesTitle,
    ];
    for (const title of titles) {
      await title.scrollIntoViewIfNeeded();
      await expect(title).toBeVisible();
    }
  }

  /** Reads a section's "<N> Listings" count and confirms its "See all" button only shows when
   * N > 3 - the rule observed live (139 and 9 listings both showed the button). */
  async _checkSeeAllVisibilityFollowsCountRule(sectionTitleLocator) {
    await sectionTitleLocator.scrollIntoViewIfNeeded();
    // Two levels up from the title lands on the section wrapper that also contains the
    // "<N> Listings" count and the "See all" button as siblings - verified against the live
    // DOM (see class doc comment).
    const section = sectionTitleLocator.locator("..").locator("..");
    const countText = (await section.getByText(/^\d+ Listings$/).textContent()) || "";
    const count = parseInt(countText, 10);
    expect(Number.isNaN(count)).toBe(false);

    const seeAllButton = section.getByRole("button", { name: /See all \d+ →/ });
    if (count > 3) {
      await expect(seeAllButton).toBeVisible();
    } else {
      await expect(seeAllButton).toBeHidden();
    }
    return count;
  }

  async checkConnectWithExpertsVisibility() {
    return this._checkSeeAllVisibilityFollowsCountRule(this.connectWithExpertsTitle);
  }

  async checkLearnLiveVisibility() {
    return this._checkSeeAllVisibilityFollowsCountRule(this.learnLiveTitle);
  }

  /** Clicks On Demand's "See all N videos" text - a real navigation to a see_all sub-page. */
  async goToOnDemand() {
    await this.onDemandTitle.scrollIntoViewIfNeeded();
    await this.page.getByText(/See all \d+ videos/).click();
    await this.page.waitForURL(/\/learning\/see_all\?q=recording/);
    await this._checkSeeAllSubPage("On Demand");
  }

  async goToResources() {
    await this.resourcesTitle.scrollIntoViewIfNeeded();
    await this.page.getByText(/See all \d+ Resources/).click();
    await this.page.waitForURL(/\/learning\/see_all\?q=resources/);
    await this._checkSeeAllSubPage("Resources");
  }

  async goToPerspectives() {
    await this.perspectivesTitle.scrollIntoViewIfNeeded();
    await this.page.getByText(/See all \d+ articles/).click();
    await this.page.waitForURL(/\/learning\/see_all\?q=perspectives/);
    await this._checkSeeAllSubPage("Perspectives");
  }

  async _checkSeeAllSubPage(sectionName) {
    await expect(this.page.getByText(sectionName, { exact: true }).first()).toBeVisible();
    await expect(this.backToLearningsButton).toBeVisible();
  }

  /** Returns from a see_all sub-page back to the main Learning page - a real link click. */
  async backToLearnings() {
    await this.backToLearningsButton.click();
    await this.page.waitForURL(/\/professional\/learning$/);
  }
}

module.exports = { ProfessionalLearningPage };
