// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalCommunityPage } = require("../../../pages/professional/community/CommunityPage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * /professional/community. The header's top-nav Community link DOES have a real in-app click
 * path here after all (found via code, not assumed - see HeaderMenu.js's communityNavLink doc
 * comment): the same click that opens an external Discourse tab also fires an internal
 * router.push to this page in the current tab. The home dashboard's own "COMMUNITY" quick-access
 * card is still purely external (HomePage.js's checkCommunityCardOpensExternalApp) - only the
 * top-nav link does both.
 */
test.describe("Professional - Community", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with the expected data", async () => {
    const community = new ProfessionalCommunityPage(session.page);
    const header = new HeaderMenu(session.page);
    // 07-profile left the session on /professional/profile - arrive here via the real top-nav
    // Community link click (closing the Discourse popup it also opens) rather than a fresh
    // page.goto().
    await community.waitForLoad(() => header.goToCommunity());
  });
});
