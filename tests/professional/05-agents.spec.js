// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../support/sharedPage");
const { ProfessionalAgentsPage } = require("../../pages/professional/AgentsPage");
const { credentialsFor } = require("../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - 2C agents", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login.spec.js to have signed in first.");

  test("loads with valid user details and both agent cards", async () => {
    const agents = new ProfessionalAgentsPage(session.page);
    const data = await agents.gotoAndLoad();

    expect(data.user_details[0]).toHaveProperty("user_id");
    expect(data.user_details[0].user_role).toBe("professional");
  });

  test("Job Scout and Rebuild resume cards link to the correct sub-pages", async () => {
    const agents = new ProfessionalAgentsPage(session.page);
    await agents.goto();
    await agents.checkCards();
  });

  test("Career Copilots page loads (does not spend a search run)", async () => {
    const agents = new ProfessionalAgentsPage(session.page);
    await agents.checkCareerCopilotsPage();
  });

  // Known bug: the Rebuild link 404s - see checkRebuildResumeLinkWorks() in AgentsPage.js.
  test("Rebuild link leads to a working page", async () => {
    const agents = new ProfessionalAgentsPage(session.page);
    await agents.checkRebuildResumeLinkWorks();
  });
});
