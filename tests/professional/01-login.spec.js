// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage, AUTH_FILE } = require("../../support/sharedPage");
const { LoginPage } = require("../../pages/LoginPage");
const { credentialsFor } = require("../../fixtures/credentials");

/**
 * Runs first (numbered 01) so its saved storageState (AUTH_FILE) exists before every other
 * file's beforeAll loads it - see support/sharedPage.js. This file itself needs a clean,
 * logged-out context, so it opts out of the default "start authenticated" behavior.
 */
test.describe("Professional - login", () => {
  const session = useSharedPage(test, { authenticated: false, videoName: "01-login" });
  const { email, password, redirectPath, hasCredentials } = credentialsFor("professional");

  test("shows the sign-in form", async () => {
    const page = session.page;
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test("empty submit shows validation errors", async () => {
    const page = session.page;
    const loginPage = new LoginPage(page);
    await loginPage.submit();

    await expect(loginPage.emailRequiredError).toBeVisible();
    await expect(loginPage.passwordRequiredError).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("invalid credentials are rejected with the correct error envelope", async () => {
    const page = session.page;
    const loginPage = new LoginPage(page);
    const body = await loginPage.submitInvalidAndWaitForFailure({
      email: "not-a-real-professional@2ndcareers.com",
      password: "wrong-password-123",
    });

    expect(body.success).toBe(false);
    expect(body.error_code).toBe(401);
    expect(body.message.length).toBeGreaterThan(0);

    await expect(loginPage.signInButton).toBeEnabled({ timeout: 10000 });
    await expect(page).toHaveURL(/\/$/);
  });

  test("valid credentials log in and return the expected access token + role", async () => {
    test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this.");

    const page = session.page;
    const loginPage = new LoginPage(page);
    const data = await loginPage.submitValidAndWaitForSuccess({ email, password });

    expect(data).toHaveProperty("access_token");
    expect(typeof data.access_token).toBe("string");
    expect(data.access_token.length).toBeGreaterThan(20);
    expect(data.user_role).toBe("professional");
    expect(data).toHaveProperty("Registration_status");
    expect(data).toHaveProperty("payment_status");
    expect(data).toHaveProperty("pricing_category");

    // A cold local dev server can still be compiling /professional/home on first visit.
    await expect(page).toHaveURL(new RegExp(redirectPath.replace(/\//g, "\\/")), { timeout: 45000 });

    // Every other file's beforeAll (support/sharedPage.js) loads this to start pre-authenticated.
    await page.context().storageState({ path: AUTH_FILE });
  });
});
