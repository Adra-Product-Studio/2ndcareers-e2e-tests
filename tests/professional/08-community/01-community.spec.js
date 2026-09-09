// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalCommunityPage } = require("../../../pages/professional/community/CommunityPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * /professional/community. No click path leads here any more (the home dashboard's COMMUNITY
 * card and the header's top-nav Community link both go straight to external Discourse URLs
 * instead - see HomePage.js and HeaderMenu.js) - still a live, working route, only reachable by
 * direct URL today.
 */
test.describe("Professional - Community", () => {
  const session = useSharedPage(test, { videoName: "08-community-01-community" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with the expected data", async () => {
    const community = new ProfessionalCommunityPage(session.page);
    await community.waitForLoad();
  });
});
