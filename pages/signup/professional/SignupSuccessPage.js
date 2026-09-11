// @ts-check
const { expect } = require("@playwright/test");

/**
 * /role_selection/professional_signup/signup_success
 * (components/reusable_page/signup_success/index.js). For a real Manual-mode signup with no
 * access token yet (this suite's whole path), it's the "check your inbox" branch, not the
 * "Proceed to Dashboard" one - that only appears for OAuth/social signups.
 */
class SignupSuccessPage {
  constructor(page) {
    this.page = page;
    // Curly apostrophe (U+2019) in the real copy, confirmed live - not a straight quote.
    this.almostThereHeading = page.getByText("You’re almost there!", { exact: true });
    this.checkInboxText = page.getByText("Please check your inbox for verification link.", { exact: true });
    // A bare <a onClick> with no href - getByRole("link") won't find it.
    this.resendEmailLink = page.getByText("Resend email", { exact: false });
    this.resendCooldownText = page.getByText(/in \d+ seconds/);
  }

  async checkCheckInboxState(email) {
    await expect(this.almostThereHeading).toBeVisible();
    await expect(this.checkInboxText).toBeVisible();
    await expect(this.page.getByText(email, { exact: true })).toBeVisible();
    await expect(this.resendEmailLink).toBeVisible();
  }

  /** Clicks Resend and confirms the 90s cooldown state takes over (pe-none styling, not a real
   * disabled attribute - confirmed live, so this checks the cooldown TEXT appearing rather than
   * an actual :disabled state). */
  async resendVerificationEmail() {
    const [response] = await Promise.all([
      this.page.waitForResponse(/\/resend_email/, { timeout: 15_000 }),
      this.resendEmailLink.click(),
    ]);
    const json = await response.json();
    expect(response.ok()).toBe(true);
    await expect(this.resendCooldownText).toBeVisible();
    return json;
  }
}

module.exports = { SignupSuccessPage };
