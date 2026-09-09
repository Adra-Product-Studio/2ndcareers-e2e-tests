// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../support/sharedPage");
const { ProfessionalCommunityPage } = require("../../pages/professional/CommunityPage");
const { credentialsFor } = require("../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - community", () => {
  const session = useSharedPage(test, { videoName: "06-community" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login.spec.js to have signed in first.");

  test("loads the discourse community payload and Join CTA", async () => {
    const community = new ProfessionalCommunityPage(session.page);
    const data = await community.gotoAndLoad();

    expect(Array.isArray(data[0].posts)).toBe(true);
  });
});
