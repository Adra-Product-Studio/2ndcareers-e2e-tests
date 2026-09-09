// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalGetSupportPage } = require("../../../pages/professional/get_support/GetSupportPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * The header's own profile-dropdown "Get Support" link actually opens an external Google Form
 * (see HeaderMenu.js), bypassing this internal route entirely - so like Community
 * (08-community.spec.js), this is one of only 2 pages in the suite still entered via a real
 * page.goto(), not an oversight.
 */
test.describe("Professional - Get Support", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads the static Coming Soon placeholder", async () => {
    const getSupport = new ProfessionalGetSupportPage(session.page);
    await getSupport.goto();
  });
});
