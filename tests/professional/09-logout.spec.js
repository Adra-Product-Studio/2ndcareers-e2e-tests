// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../support/sharedPage");
const { HeaderMenu } = require("../../pages/professional/HeaderMenu");
const { LoginPage } = require("../../pages/LoginPage");
const { credentialsFor } = require("../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * Runs last - signs out of the account that's been authenticated (via storageState, see
 * support/sharedPage.js) since 01-login.spec.js and confirms the app returns to the public
 * login page, closing the loop for this role's journey.
 */
test.describe("Professional - logout", () => {
  const session = useSharedPage(test, { videoName: "09-logout" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login.spec.js to have signed in first.");

  test("signs out from the profile menu and returns to the login page", async () => {
    const page = session.page;
    await page.goto("/professional/home");

    const header = new HeaderMenu(page);
    await header.signOut();

    const loginPage = new LoginPage(page);
    await expect(loginPage.heading).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});
