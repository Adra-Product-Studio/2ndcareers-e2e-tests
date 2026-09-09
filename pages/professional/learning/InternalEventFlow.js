// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../../support/apiEnvelope");

/**
 * The nested Learning -> event detail -> Book & Pay flow. Event URLs use an opaque encrypted
 * slug (app/(routes)/professional/learning/[event_slug]/page.js) that isn't stable to hardcode,
 * so this always reaches a listing by clicking its "Details" card from /professional/learning,
 * the same way a person would.
 *
 * IMPORTANT: the book_and_pay page's confirm button ("Confirm & Pay ₹<amount>" for a paid
 * listing, "Confirm Registration" for a free one) hits a real Razorpay checkout for paid
 * listings - this Page Object deliberately stops one step before clicking it. Don't click that
 * button without a designated sandbox/test payment method; doing so on a paid listing would
 * attempt a real charge.
 */
class ProfessionalInternalEventFlow {
  constructor(page) {
    this.page = page;
    this.detailsButtons = page.getByRole("button", { name: "Details" });
    this.backToLearningsButton = page.getByRole("button", { name: "Back to Learnings" });
    this.registerButton = page.getByRole("button", { name: "Register", exact: false });
    // Not a real <h*>/role="heading" element in the DOM (just styled to look like one) - matched
    // by visible text instead of role, otherwise getByRole("heading", ...) never finds it.
    this.bookingSummaryHeading = page.getByText("Booking Summary", { exact: true });
    // Whichever listing is first can be paid ("Confirm & Pay ₹900") or free ("Confirm
    // Registration") - match either rather than assuming a specific one.
    this.confirmButton = page.getByRole("button", { name: /Confirm/i });
  }

  /** Opens the first listed event's detail page - call while already on /professional/learning
   * (pass `beforeClick` if you need to navigate there first; defaults to a fresh page.goto()). */
  async openFirstListingDetails(beforeClick = () => this.page.goto("/professional/learning")) {
    await beforeClick();
    const data = await waitForApiData(this.page, /\/get_listing_view/, () =>
      this.detailsButtons.first().click()
    );

    expect(data).toHaveProperty("listing_id");
    expect(typeof data.title).toBe("string");
    expect(data.title.length).toBeGreaterThan(0);
    expect(data).toHaveProperty("pricing");
    expect(data).toHaveProperty("schedule");
    expect(["not_registered", "registered"]).toContain(data.registration_status);
    return data;
  }

  async checkDetailPage() {
    await expect(this.backToLearningsButton).toBeVisible();
    await expect(this.registerButton).toBeVisible();
  }

  /**
   * Clicks through to Book & Pay and verifies the summary - stops before Confirm & Pay.
   * app/(routes)/professional/learning/[event_slug]/book_and_pay/page.js shows a full-page
   * skeleton until its own GET /get_listing_view (page_from=book_and_pay) call resolves - waiting
   * on that response (not just the URL change) avoids racing that load, the same class of bug
   * fixed earlier for the Learning see_all sub-pages.
   */
  async goToBookAndPay() {
    await waitForApiData(this.page, /\/get_listing_view/, () => this.registerButton.click());
    await this.page.waitForURL(/\/book_and_pay/, { timeout: 15000 });
    await expect(this.bookingSummaryHeading).toBeVisible();
    await expect(this.confirmButton).toBeVisible();
  }
}

module.exports = { ProfessionalInternalEventFlow };
