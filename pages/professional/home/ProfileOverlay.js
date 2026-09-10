// @ts-check
const { expect } = require("@playwright/test");

/**
 * The first-time-user "Profile overlay" modal (components/overallmodal/modal_cards/
 * professional_profile_overlay/index.js, registered as modal_name "profile_overlay"). Opened by
 * the HEADER, not the Home page (components/reusable_page/professional_header/index.js), gated
 * on the project_log cookie's `show_profile_overlay` flag being true - see support/cookies.js for
 * how tests simulate that on this real, otherwise-already-onboarded account.
 *
 * Confirmed live in the real component source: there is NO close/dismiss control on this modal at
 * all (the close-icon button and the outside-click confirmation are both commented out in the
 * real code) - "Confirm" and "Edit Profile" are the only two ways out, and BOTH submit real data
 * to POST /professional_register (services/auth/index.js handle_professional_your_next_chapter).
 * That means once this modal is showing, a test has no safe no-op path through it - completeSafely()
 * below always intercepts that endpoint first so nothing is ever actually sent to the real backend,
 * regardless of which button ends up used.
 */
class ProfessionalProfileOverlay {
  constructor(page) {
    this.page = page;
    // Scoped to the overlay's own root (<main className="professional_profile_overlay">,
    // confirmed live) - "Yes" (willing_to_relocate) in particular is generic enough to risk
    // matching something unrelated if matched page-wide instead.
    this.root = page.locator(".professional_profile_overlay");
    this.heading = this.root.getByText("Review your profile", { exact: true });
    this.loadingText = this.root.getByText("Getting Your Profile...");
    // All 3 are plain onClick divs, not real checkbox/button elements
    // (components/Inputs/ButtonTypeSelect.jsx) - every one of validate/professional_signup.js's
    // YourNextChapterValidation required fields needs a selection or Confirm/Edit Profile both
    // fail client-side (a toast, no request at all) - confirmed live. Option labels like "Remote"
    // and especially "Yes" are generic enough to risk matching the account's own free-text About
    // bio (rendered elsewhere in this same overlay) if matched root-wide, so each is scoped to
    // its own field's wrapper - the nearest ancestor of that field's own heading that also
    // contains an actual option div - rather than matched loosely by text alone.
    this.firstJobTypeOption = this._fieldOption(/Job Type/, "Full-time Roles");
    this.firstLocationPreferenceOption = this._fieldOption(/Work Location Preference/, "Remote");
    this.willingToRelocateYesOption = this._fieldOption("Willing to Relocate?", "Yes");
    this.confirmButton = this.root.getByRole("button", { name: "Confirm", exact: true });
  }

  _fieldOption(fieldHeadingName, optionText) {
    return this.root
      .getByRole("heading", { name: fieldHeadingName })
      .locator("xpath=ancestor::*[.//div[contains(@class,'custom_button_design_select')]][1]")
      .getByText(optionText, { exact: true });
  }

  /** Call right after triggering show_profile_overlay (a cookie write + reload) - the overlay's
   * own GET /professional_resume_builder can take a moment, during which it shows a loading state
   * instead of the real heading. */
  async waitForOpen() {
    await expect(this.heading).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Selects one option in each of the 3 required fields (validate/professional_signup.js's
   * YourNextChapterValidation - job_type, location_preference, willing_to_relocate; submitting
   * with any one missing fails this modal's own client-side validation before any request fires
   * at all, confirmed live: a toast, no request, Confirm/Edit Profile both silently no-op),
   * intercepts POST /professional_register so the real account is never actually mutated, then
   * clicks Confirm and waits for the modal to close. Fakes the same success envelope every other
   * endpoint in this suite expects, so the app's own success-path code (closing the modal,
   * updating the cookie) runs exactly as it would for a real save.
   */
  async completeSafely() {
    await this.firstJobTypeOption.click();
    await this.firstLocationPreferenceOption.click();
    await this.willingToRelocateYesOption.click();

    await this.page.route(/\/professional_register/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: {}, error_code: 0, message: "ok", success: true }),
      })
    );

    await this.confirmButton.click();
    await expect(this.heading).toBeHidden();
    await this.page.unroute(/\/professional_register/);
  }
}

module.exports = { ProfessionalProfileOverlay };
