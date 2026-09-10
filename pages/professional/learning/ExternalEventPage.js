// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiDataMulti } = require("../../../support/apiEnvelope");
const { mockApiField } = require("../../../support/mockResponse");
const { reapplyChatbotGuard } = require("../../../support/chatbotGuard");

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
   * checking the resulting URL. Returns `true` if an external event's details opened, `false` if
   * none of the first `maxAttempts` cards were external - a real, data-dependent "none available
   * right now" outcome rather than a selector bug, since the caller decides how to treat it (this
   * suite skips the test rather than failing it): Connect with Experts/Learn Live only show a
   * 3-item PREVIEW before "See all" is clicked (confirmed live, matching MarketplacePage's
   * documented >3 "See all" visibility rule), so the pool actually reachable here is Featured
   * Listings (1) + both previews (3+3) = 7 cards, not the full 139/9-listing count - reaching into
   * the full "See all" listing (a materially different page layout) is out of scope for this check.
   *
   * The listing cards themselves are lazy-mounted on scroll (same pattern as the On Demand/
   * Resources/Perspectives sections further down this page - confirmed live: right after load,
   * only the section headings exist, zero "Details" buttons anywhere) - scrolling each section
   * title into view first is what actually mounts its cards.
   *
   * A miss lands on an INTERNAL event's own detail page instead (a different route from this
   * external one) - that page always has its own "Back to Learnings" button (see
   * InternalEventFlow.js), a real in-app link back to the marketplace root. Clicking it re-runs
   * the same dual-API load goto() uses, but as a normal SPA transition (a brief loading state on
   * the same page) rather than a full page.goto() reload - no page.goBack() needed (confirmed live
   * it's unreliable here: whether it refetches get_marketplace/get_training_data or restores them
   * from Next.js's router cache varies, and either way it was observed hanging well past a
   * minute), and no reload flash between attempts either.
   */
  async openFirstExternalEventDetails(maxAttempts = 12) {
    await this._scrollListingSectionsIntoView();
    const total = Math.min(await this.detailsButtons.count(), maxAttempts);
    for (let i = 0; i < total; i++) {
      await this.detailsButtons.nth(i).click();
      if (/\/learning\/external_event\?evt=/.test(this.page.url())) return true;
      await waitForApiDataMulti(this.page, [/\/get_training_data/, /\/get_marketplace/], () =>
        this.page.getByRole("button", { name: "Back to Learnings" }).click()
      );
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

  /**
   * Returns `true` if the popup opened, `false` otherwise. Some events' own `registration_link`
   * is an empty string in real data (confirmed live in GET /get_training_data samples) - a
   * browser's `window.open("")` behavior for that isn't guaranteed to fire a "popup" event the
   * same way everywhere, so this doesn't hard-fail when it doesn't; the caller decides whether
   * that's a skip.
   */
  async registerForUnpaidEvent() {
    const popup = await Promise.all([
      this.page.waitForEvent("popup", { timeout: 10000 }).catch(() => null),
      this.registerButton.click(),
    ]).then(([p]) => p);
    if (!popup) return false;
    await popup.waitForLoadState().catch(() => {});
    await popup.close();
    return true;
  }

  /**
   * A real, confirmed gap in the product code, safely observable without ever clicking the real
   * button: RegisterButton (app/(routes)/professional/learning/external_event/page.js) only
   * changes its LABEL when already registered ("Registered" vs "Register →") - it never actually
   * disables itself (no `disabled` prop is ever passed to the underlying ButtonSpinner), so a
   * second click would fire the exact same onRegister handler again. This account isn't actually
   * registered for whichever event openFirstExternalEventDetails() landed on, so that state is
   * forced the same way this suite reaches every other otherwise-unreachable state: intercepting
   * this detail page's own real GET /get_training_data?id=<event> response (confirmed live -
   * services/professional/index.js's handle_get_individual_trainings, a different query-string
   * variant of the SAME endpoint MarketplacePage's plain listing call also uses, hence the `\?id=`
   * anchor below) and overriding just `payment_status` on top of the real payload. Never clicks
   * the button - the whole point is to show it's clickable when it provably shouldn't be, not to
   * exercise whatever fires on click.
   *
   * Returns `true`/`false` for whether the mocked state was actually reached, rather than
   * asserting it directly - confirmed live in CI (twice, at both a 30s and a 60s budget) that
   * this exact endpoint can go unanswered against the real staging backend for reasons this
   * suite has no way to diagnose remotely (this account's real UI behavior once the state IS
   * reached has been confirmed correct every time it was). Failing outright over an
   * infrastructure-level "no response arrived" - as opposed to a genuine assertion mismatch once
   * one did - cascaded into every test after it for the rest of the shared session, confirmed the
   * hard way (twice) in CI; the caller skips instead when this comes back false. A real
   * regression in the button's own text/disabled state, once the mocked response DOES land, still
   * throws normally - only the "could we even establish the state" phase is soft.
   */
  async checkRegisterButtonMissingDisabledState() {
    const EVENT_ENDPOINT = /\/get_training_data\?id=/;
    await this.page.unrouteAll({ behavior: "ignoreErrors" });
    await mockApiField(this.page, EVENT_ENDPOINT, (json) => {
      json.data.data.payment_status = "paid";
      return json;
    });

    let response;
    try {
      [response] = await Promise.all([this.page.waitForResponse(EVENT_ENDPOINT, { timeout: 45_000 }), this.page.reload()]);
    } catch {
      // Couldn't even establish the mocked state - see doc comment. Recover to a KNOWN, DIFFERENT
      // page (not a reload of this same one, which was observed live to just re-issue the exact
      // same unanswered request) regardless of what caused it, then let the caller skip.
      await this.page.unrouteAll({ behavior: "ignoreErrors" });
      await this.page.goto("/professional/learning", { timeout: 60_000 }).catch(() => {});
      await reapplyChatbotGuard(this.page);
      return false;
    }

    try {
      expect(response.ok()).toBe(true);
      await reapplyChatbotGuard(this.page);

      await expect(this.registerButton).toHaveText("Registered");
      // The real gap: still enabled, not disabled, despite the label claiming registration done.
      await expect(this.registerButton).toBeEnabled();
    } finally {
      await this.page.unrouteAll({ behavior: "ignoreErrors" });
      await this.page.goto("/professional/learning", { timeout: 60_000 }).catch(() => {});
      await reapplyChatbotGuard(this.page);
    }
    return true;
  }
}

module.exports = { ProfessionalExternalEventPage };
