// @ts-check
const { test } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalCareerCopilotsPage } = require("../../../pages/professional/agents/CareerCopilotsPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * A metered AI tool - this account has a small number of "Runs Remaining" (confirmed live: 3).
 * Every check here is non-consuming (see pages/professional/agents/CareerCopilotsPage.js); an
 * actual search is deliberately never submitted.
 */
test.describe("Professional - 2C Agents - Career Copilots", () => {
  const session = useSharedPage(test, { videoName: "06-agents-02-career-copilots" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with the initial empty state", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.goto();
    await copilots.checkInitialState();
  });

  test("chatbot-type dropdown lists all 3 modes", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.checkModeDropdown();
  });

  test("'Find Jobs Based on My Profile' checkbox toggles", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.checkProfileCheckboxToggles();
  });

  test("sending an empty message is blocked client-side, without spending a run", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.checkEmptyMessageIsBlocked();
  });
});
