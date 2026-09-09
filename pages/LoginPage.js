// @ts-check
const { waitForApiData, waitForFailedApiData } = require("../support/apiEnvelope");

/**
 * Page Object for the "Sign in to 2nd Careers" page (app/(routes)/(auth)/page.js in the
 * main frontend repo). Every role (professional/employer/partner/superadmin) logs in through
 * this same form - the server decides the role from the account, so one Page Object covers all four.
 */
class LoginPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Sign in to 2nd Careers" });
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot password?" });
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.signInButton = page.getByRole("button", { name: "Sign in Securely" });
    this.emailRequiredError = page.getByText("Email id is required");
    this.passwordRequiredError = page.getByText("Password is required");
  }

  async goto() {
    await this.page.goto("/");
  }

  async fillCredentials({ email = "", password = "" } = {}) {
    // pressSequentially, not fill() - types one character at a time (like a real person) so
    // this is actually watchable in the recorded video, instead of the value just appearing.
    await this.emailInput.fill("");
    if (email) await this.emailInput.pressSequentially(email, { delay: 60 });
    await this.passwordInput.fill("");
    if (password) await this.passwordInput.pressSequentially(password, { delay: 60 });
  }

  async submit() {
    await this.signInButton.click();
  }

  async submitCredentials(credentials) {
    await this.fillCredentials(credentials);
    await this.submit();
  }

  /**
   * Submits and validates the failure envelope from POST /login - verified live:
   * { data: {}, error_code: 401, message: "<string>", success: false }
   */
  async submitInvalidAndWaitForFailure(credentials) {
    return waitForFailedApiData(this.page, /\/login$/, () => this.submitCredentials(credentials));
  }

  /**
   * Submits and validates the success envelope from POST /login - verified live:
   * { data: { Registration_status, access_token, payment_status, pricing_category,
   *   resume_builder_model, user_role }, error_code: 0, message, success: true }
   */
  async submitValidAndWaitForSuccess(credentials) {
    return waitForApiData(this.page, /\/login$/, () => this.submitCredentials(credentials));
  }
}

module.exports = { LoginPage };
