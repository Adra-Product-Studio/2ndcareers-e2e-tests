// @ts-check

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
    await this.emailInput.fill("");
    if (email) await this.emailInput.fill(email);
    await this.passwordInput.fill("");
    if (password) await this.passwordInput.fill(password);
  }

  async submit() {
    await this.signInButton.click();
  }

  async submitCredentials(credentials) {
    await this.fillCredentials(credentials);
    await this.submit();
  }
}

module.exports = { LoginPage };
