// @ts-check
const { expect } = require("@playwright/test");

// validate/professional_signup.js's NewUserSignupValidation - copied as literal fixture text
// (same pattern as this suite's other PERCENTAGE_CONTENT/STEP_TITLES fixtures) since validate/
// sits outside this suite's read-only exception. All 5 checks run in ONE pass (not field-by-field
// as you fix each one), so a blank-form submit shows all 5 at once.
const ERRORS = {
  emailRequired: "Email address is required",
  emailInvalid: "Invalid email format",
  passwordRequired: "Password is required",
  passwordWeak:
    "Password must be 8-20 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.",
  confirmRequired: "Please confirm your password",
  confirmMismatch: "Password and Confirm Password do not match",
  termsRequired: "You must accept the Terms & Privacy Policy to create an account",
  ageRequired: "You must confirm that you meet the platform's eligibility requirements",
};

/**
 * Step 1 of professional signup - /role_selection/professional_signup/new_user_signup
 * (app/(routes)/(auth)/role_selection/professional_signup/new_user_signup/page.js). Validated by
 * validate/professional_signup.js's NewUserSignupValidation via validator_error_send
 * (validate/index.js) - a failing validation renders every applicable inline error and returns
 * BEFORE any request fires (confirmed live), so this suite's own request-listener checks are what
 * actually prove "nothing was sent", not just "no visible success".
 */
class NewUserSignupPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder(/We.ll use this email to send you important updates/);
    this.passwordInput = page.getByPlaceholder("Enter your password here").first();
    this.confirmPasswordInput = page.getByPlaceholder("Enter your password here").last();
    this.termsCheckbox = page.locator("#terms_and_conditions");
    this.ageCheckbox = page.locator("#age_verification");
    this.submitButton = page.getByRole("button", { name: /Let.s move to About You/ });
    this.signInLink = page.getByRole("link", { name: "Sign in", exact: false });
  }

  async checkPageChrome() {
    await expect(this.page.getByRole("heading", { name: "New User Signup", exact: true })).toBeVisible();
    // The 3-step progress list - json/json_data/auth/index.js's professional_steps titles,
    // rendered by the shared professional_signup/layout.js wrapper as its own paragraphs. "New
    // User Signup" also appears as this page's own <h4> (checked above), so this is scoped to
    // the step list's own class rather than a page-wide text match, confirmed live to otherwise
    // be a strict-mode violation on that one title.
    for (const title of ["New User Signup", "About You", "Your Career Story"]) {
      await expect(this.page.locator(".sign_up_steps_title", { hasText: title })).toBeVisible();
    }
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.termsCheckbox).toBeVisible();
    await expect(this.ageCheckbox).toBeVisible();
    await expect(this.page.getByText("I agree to all the", { exact: true })).toBeVisible();
    await expect(this.page.getByText("I understand this platform is for experienced professionals", { exact: true })).toBeVisible();
  }

  /** Submits whatever's currently in the form and asserts no /professional_register request
   * fires (validation blocked it client-side) and every `expectedErrors` string is visible. */
  async submitAndExpectValidationErrors(expectedErrors) {
    let requestFired = false;
    const onRequest = (req) => {
      if (/\/professional_register/.test(req.url())) requestFired = true;
    };
    this.page.on("request", onRequest);
    await this.submitButton.click();
    await this.page.waitForTimeout(500);
    this.page.off("request", onRequest);

    expect(requestFired, "expected no /professional_register request for an invalid submission").toBe(false);
    for (const message of expectedErrors) {
      await expect(this.page.getByText(message, { exact: true }).first()).toBeVisible();
    }
  }

  async checkEmptyFormShowsAllErrors() {
    await this.submitAndExpectValidationErrors([
      ERRORS.emailRequired,
      ERRORS.passwordRequired,
      ERRORS.confirmRequired,
      ERRORS.termsRequired,
      ERRORS.ageRequired,
    ]);
  }

  async checkInvalidEmailFormat() {
    await this.emailInput.fill("not-an-email");
    await this.submitAndExpectValidationErrors([ERRORS.emailInvalid]);
  }

  async checkEmptyConfirmPassword(email) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill("ValidPass1!");
    await this.confirmPasswordInput.fill("");
    await this.submitAndExpectValidationErrors([ERRORS.confirmRequired]);
  }

  async checkMismatchedConfirmPassword() {
    await this.confirmPasswordInput.fill("abcd");
    await this.submitAndExpectValidationErrors([ERRORS.confirmMismatch]);
  }

  async checkWeakPassword(email) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill("weak");
    await this.confirmPasswordInput.fill("weak");
    await this.submitAndExpectValidationErrors([ERRORS.passwordWeak]);
  }

  /** Matching, valid passwords but neither checkbox ticked yet - both checkbox errors, no
   * password/email errors. */
  async checkMissingCheckboxes(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await expect(this.termsCheckbox).not.toBeChecked();
    await expect(this.ageCheckbox).not.toBeChecked();
    await this.submitAndExpectValidationErrors([ERRORS.termsRequired, ERRORS.ageRequired]);
  }

  /**
   * The real, full valid submission - checks both boxes, submits, and waits for the actual
   * POST /professional_register response (error_code 0, "Professional Account created
   * successfully" - confirmed live) rather than just the redirect, so a silently-failing
   * request can't pass as a redirect that happened to already be in flight from something else.
   */
  async submitValid(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.termsCheckbox.check();
    await this.ageCheckbox.check();
    await expect(this.termsCheckbox).toBeChecked();
    await expect(this.ageCheckbox).toBeChecked();

    const [response] = await Promise.all([
      this.page.waitForResponse(/\/professional_register/, { timeout: 15_000 }),
      this.submitButton.click(),
    ]);
    const json = await response.json();
    expect(response.ok()).toBe(true);
    expect(json.error_code).toBe(0);

    // A client-side route push resolving isn't the same as the new page having actually
    // rendered anything yet (a cold Turbopack compile of a not-yet-visited route can leave the
    // screen genuinely blank for several seconds past a bare waitForURL) - waiting for real
    // content here means the NEXT file's own first test starts from an already-rendered page,
    // not racing this one's own transition.
    await this.page.waitForURL(/\/about_you/, { timeout: 10_000 });
    await expect(this.page.getByRole("heading", { name: "About you", exact: true })).toBeVisible({ timeout: 20_000 });
    return json;
  }
}

module.exports = { NewUserSignupPage, ERRORS };
