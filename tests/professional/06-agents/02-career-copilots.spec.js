// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalCareerCopilotsPage } = require("../../../pages/professional/agents/CareerCopilotsPage");
const { ProfessionalAgentsHubPage } = require("../../../pages/professional/agents/AgentsHubPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * A metered AI tool - this account has a small number of "Runs Remaining" (confirmed live: 3).
 * Every check here is non-consuming (see pages/professional/agents/CareerCopilotsPage.js); an
 * actual search is deliberately never submitted.
 */
test.describe("Professional - 2C Agents - Career Copilots", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with the initial empty state", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    const agentsHub = new ProfessionalAgentsHubPage(session.page);
    // 01-hub.spec.js left the session on the 2C Agents hub - arrive here via the real "Get
    // Started" link click (Job Scout's card) rather than a fresh page.goto().
    await copilots.goto(() => agentsHub.jobScoutGetStartedLink.click());
    await expect(session.page).toHaveURL(/\/career_copilots/);
    await copilots.checkInitialState();
  });

  test("chatbot-type dropdown lists all 3 modes", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.checkModeDropdown();
  });

  test("actually selecting a mode (including the nested 2c Agents submenu) relabels the toggle", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.checkModeSelectionActuallyChangesMode();
  });

  test("'Find Jobs Based on My Profile' checkbox toggles", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.checkProfileCheckboxToggles();
  });

  test("sending an empty message is blocked client-side, without spending a run", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.checkEmptyMessageIsBlocked();
  });

  test("remaining_runs mocked to 0 shows the real 'Limit has been reached' paywall", async () => {
    const copilots = new ProfessionalCareerCopilotsPage(session.page);
    await copilots.checkPaywallWhenNoRunsRemaining();
  });
});
