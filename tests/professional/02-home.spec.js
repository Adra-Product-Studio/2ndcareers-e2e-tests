// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../support/sharedPage");
const { ProfessionalHomePage } = require("../../pages/professional/HomePage");
const { HeaderMenu } = require("../../pages/professional/HeaderMenu");
const { credentialsFor } = require("../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - home", () => {
  const session = useSharedPage(test, { videoName: "02-home" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login.spec.js to have signed in first.");

  test("loads dashboard data with the expected keys and values", async () => {
    const page = session.page;
    const home = new ProfessionalHomePage(page);
    const { home: data } = await home.gotoAndLoad();

    expect(data.user_name.trim().length).toBeGreaterThan(0);
    expect(data.profile_percentage).toBeGreaterThanOrEqual(0);
    expect(data.profile_percentage).toBeLessThanOrEqual(100);
    expect(["Y", "N"]).toContain(data.show_video_status);
  });

  test("shows the header's notification count and user identity", async () => {
    const page = session.page;
    const header = new HeaderMenu(page);
    const data = await header.waitForUserDetails(() => page.goto("/professional/home"));

    expect(data.notification_count).toBeGreaterThanOrEqual(0);
    expect(data.user_details[0].email_id).toContain("@");
  });

  test("shows every dashboard card and CTA", async () => {
    const page = session.page;
    const home = new ProfessionalHomePage(page);
    await home.goto();
    await home.checkCards();
  });
});
