// @ts-check
const { test, expect } = require("@playwright/test");
const { LoginPage } = require("../../pages/LoginPage");
const { credentialsFor } = require("../../fixtures/credentials");

/**
 * Registers one continuous "<role> login - full flow" test, run as a single browser
 * session (test.step per stage) so a headed/demo run doesn't reopen Chrome per case -
 * each stage shows up as a labeled step in the trace/HTML report instead.
 */
function registerLoginFlowTest(role) {
  test(`${role} login - full flow`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    const { email, password, redirectPath, hasCredentials } = credentialsFor(role);

    await test.step("open the login page", async () => {
      await loginPage.goto();
      await expect(loginPage.heading).toBeVisible();
    });

    await test.step("empty submit shows validation errors", async () => {
      await loginPage.submit();
      await expect(loginPage.emailRequiredError).toBeVisible();
      await expect(loginPage.passwordRequiredError).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
    });

    await test.step("invalid credentials are rejected", async () => {
      await loginPage.submitCredentials({
        email: `not-a-real-${role}@2ndcareers.com`,
        password: "wrong-password-123",
      });

      // Backend rejects credentials -> spinner clears and button re-enables, no redirect.
      await expect(loginPage.signInButton).toBeEnabled({ timeout: 10000 });
      await expect(page).toHaveURL(/\/$/);
    });

    await test.step(`valid ${role} credentials redirect to the ${role} view`, async () => {
      if (!hasCredentials) {
        test.info().annotations.push({
          type: "skipped",
          description: `Set ${role.toUpperCase()}_TEST_EMAIL and ${role.toUpperCase()}_TEST_PASSWORD (see .env.test.example) to run this step.`,
        });
        return;
      }

      await loginPage.submitCredentials({ email, password });

      // Generous timeout: on a local dev server (Turbopack) the destination route can still
      // be cold-compiling on first visit (observed 8-20s+ for a fresh route) - a built
      // staging/CI environment resolves this almost immediately, so it doesn't slow those runs.
      const REDIRECT_TIMEOUT = 45000;

      if (role === "superadmin") {
        // Non-local builds hand off to a separate admin app via window.location.href
        // instead of an in-app route - accept either outcome.
        await page.waitForURL(
          (url) => url.href.includes("super_admin_access_token=") || url.pathname.startsWith("/super_admin"),
          { timeout: REDIRECT_TIMEOUT }
        );
      } else {
        await expect(page).toHaveURL(new RegExp(redirectPath.replace(/\//g, "\\/")), { timeout: REDIRECT_TIMEOUT });
      }
    });
  });
}

module.exports = { registerLoginFlowTest };
