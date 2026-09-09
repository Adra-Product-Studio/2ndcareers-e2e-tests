// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { LoginPage } = require("../../../pages/LoginPage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * Every other file in this suite reaches its own page directly (page.goto()) so each is
 * independently runnable - see e2e-tests/README.md for why the suite is organized page-by-page.
 * This file is the one place that still walks between top-level sections via real nav-link
 * clicks, proving the header survives client-side transitions without a full reload (verified
 * live: a value stashed on `window` before a nav-link click was still there afterward) rather
 * than every test re-proving that same fact.
 */
test.describe("Professional - top-level navigation via header links", () => {
  const session = useSharedPage(test, { videoName: "02-navigation" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("Home -> Jobs -> Learning -> 2C Agents -> Home, via nav links", async () => {
    const page = session.page;
    const header = new HeaderMenu(page);

    await page.goto("/professional/home");
    await expect(page).toHaveURL(/\/professional\/home/);

    await header.goToJobs();
    await expect(page).toHaveURL(/\/professional\/jobs/);

    await header.goToLearning();
    await expect(page).toHaveURL(/\/professional\/learning$/);

    await header.goToAgents();
    await expect(page).toHaveURL(/\/professional\/2c_agent$/);

    await header.goToHome();
    await expect(page).toHaveURL(/\/professional\/home/);
  });

  test("Profile dropdown -> My Profile / Upgrade / Help, via real clicks", async () => {
    const page = session.page;
    const header = new HeaderMenu(page);

    await page.goto("/professional/home");
    await header.checkProfileMenuLinks();

    await header.goToProfileMenuLink("My Profile");
    await expect(page).toHaveURL(/\/professional\/profile/);

    await header.goToProfileMenuLink("Upgrade");
    await expect(page).toHaveURL(/\/professional\/upgrade/);

    await header.goToProfileMenuLink("Help");
    await expect(page).toHaveURL(/\/professional\/help/);
  });

  test("Sign out from the profile menu, back to the login page", async () => {
    const page = session.page;
    const header = new HeaderMenu(page);
    await header.signOut();

    const loginPage = new LoginPage(page);
    await expect(loginPage.heading).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});
