// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiDataMulti } = require("../../../support/apiEnvelope");

/**
 * /professional/learning/external_event?evt=<encrypted id>. Distinct from the internal event
 * detail page (app/(routes)/professional/learning/[event_slug]/page.js) - different route,
 * different fields (LumaPriceDisplay instead of PriceDisplay, formattedDate/formattedTime
 * instead of schedule_detail), and a different, simpler registration flow: unpaid events just
 * `window.open(registration_link)` (external, no internal payment at all); paid events go
 * through a Razorpay/Stripe session - this Page Object never starts a real payment.
 *
 * Both internal and external event cards render on the same Learning marketplace sections
 * (Connect with Experts / Learn Live), indistinguishable by a generic locator ahead of time - a
 * card is only provably "external" after clicking "Details" and seeing which route it lands on.
 * openFirstExternalEventDetails() finds one by trying each visible card's Details button in
 * turn, going back to the marketplace between misses.
 */
class ProfessionalExternalEventPage {
  constructor(page) {
    this.page = page;
    this.detailsButtons = page.getByRole("button", { name: "Details" });
    this.registerButton = page.getByRole("button", { name: /Register|Registered|Processing/ });
  }

  /**
   * Navigates to /professional/learning (or runs a click `action`) and waits for BOTH data
   * sources the Connect with Experts/Learn Live sections merge before rendering any card at all:
   * GET /get_training_data (external events - the same call MarketplacePage.waitForLoad() waits
   * for) AND GET /get_marketplace (internal events). Confirmed live: waiting for only one of the
   * two still renders zero cards no matter how long you then wait or scroll - both listeners are
   * registered before the navigation to avoid racing either response, same pattern as
   * apiEnvelope.js's other multi-response callers.
   */
  async goto(action = () => this.page.goto("/professional/learning")) {
    await waitForApiDataMulti(this.page, [/\/get_training_data/, /\/get_marketplace/], action);
  }

  /**
   * Call after goto(). Tries up to `maxAttempts` visible "Details" cards, clicking each and
   * checking the resulting URL, reloading fresh to try the next one on a miss (an internal
   * event). Returns `true` if an external event's details opened, `false` if none of the first
   * `maxAttempts` cards were external - a real, data-dependent "none available right now" outcome
   * rather than a selector bug, since the caller decides how to treat it (this suite skips the
   * test rather than failing it): Connect with Experts/Learn Live only show a 3-item PREVIEW
   * before "See all" is clicked (confirmed live, matching MarketplacePage's documented >3 "See
   * all" visibility rule), so the pool actually reachable here is Featured Listings (1) + both
   * previews (3+3) = 7 cards, not the full 139/9-listing count - reaching into the full "See all"
   * listing (a materially different page layout) is out of scope for this check.
   *
   * The listing cards themselves are lazy-mounted on scroll (same pattern as the On Demand/
   * Resources/Perspectives sections further down this page - confirmed live: right after load,
   * only the section headings exist, zero "Details" buttons anywhere) - scrolling each section
   * title into view first is what actually mounts its cards. Reloading (not page.goBack()) between
   * attempts: goBack() was observed live to hang unpredictably (whether it refetches
   * get_marketplace/get_training_data or restores them from Next.js's router cache varies) - a
   * fresh goto() re-runs the one path already proven fast and reliable.
   */
  async openFirstExternalEventDetails(maxAttempts = 12) {
    await this._scrollListingSectionsIntoView();
    const total = Math.min(await this.detailsButtons.count(), maxAttempts);
    for (let i = 0; i < total; i++) {
      await this.detailsButtons.nth(i).click();
      if (/\/learning\/external_event\?evt=/.test(this.page.url())) return true;
      // Not page.goBack() - confirmed live it's unreliable here (whether it refetches the two
      // listing sources or restores them from Next.js's router cache varies, and either way it
      // was observed hanging well past a minute). A fresh goto() re-runs the one path already
      // proven reliable (dual-API-wait, confirmed fast in isolation).
      await this.goto();
      await this._scrollListingSectionsIntoView();
    }
    return false;
  }

  /**
   * Scrolling just the section TITLE into view isn't enough to mount its cards - confirmed live,
   * the titles render immediately but the card grids underneath are lazy (same pattern as On
   * Demand/Resources/Perspectives further down this page). Scrolling the whole page to the
   * bottom mounts every lazy section in one pass, same as MarketplacePage.checkAllSectionTitles()
   * does implicitly by visiting each title in top-to-bottom order.
   */
  async _scrollListingSectionsIntoView() {
    // window.scrollTo() was a no-op - confirmed live, the page itself has no scrollable overflow;
    // the real scroll container is an inner wrapper (.professional_body_height, the shared
    // professional layout's content area). scrollIntoViewIfNeeded() finds and scrolls whatever
    // the nearest real scrollable ancestor is automatically (the same mechanism
    // MarketplacePage.checkAllSectionTitles() already relies on), so target real elements with it
    // instead of guessing the container.
    for (const heading of ["Connect with Experts - Stay Tuned!", "Learn Live"]) {
      await this.page.getByText(heading, { exact: true }).scrollIntoViewIfNeeded().catch(() => {});
    }
    // The API response landing doesn't mean React has finished replacing the loading skeleton
    // with real cards yet (confirmed live - a screenshot at the default timeout still showed
    // placeholder-glow shimmer blocks, not real "Details" buttons) - the same class of race
    // fixed earlier for the Learning see_all sub-pages, so this gets the same generous allowance.
    await expect(this.detailsButtons.first()).toBeVisible({ timeout: 20000 });
  }

  async checkDetailPage() {
    await expect(this.registerButton).toBeVisible();
  }

  /**
   * Unpaid external events just open `registration_link` in a new tab - no internal payment
   * flow at all, so this is fully safe to click through end-to-end. Paid ones go through
   * Razorpay/Stripe (handle_learning_payment_session) - NOT exercised here; the button's label
   * itself ("Register" vs "Processing"/"Registered") is enough to tell which branch is live
   * without needing to inspect the event's own type_of_event field.
   */
  async isUnpaidRegisterButton() {
    const label = (await this.registerButton.textContent()) || "";
    return /Register\s*→?$/.test(label.trim());
  }

  async registerForUnpaidEvent() {
    const [popup] = await Promise.all([this.page.waitForEvent("popup"), this.registerButton.click()]);
    await popup.waitForLoadState().catch(() => {});
    await popup.close();
  }
}

module.exports = { ProfessionalExternalEventPage };
