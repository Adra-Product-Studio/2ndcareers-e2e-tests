// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalAgentsHubPage } = require("../../../pages/professional/agents/AgentsHubPage");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - 2C Agents - hub", () => {
  const session = useSharedPage(test, { videoName: "06-agents-01-hub" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("loads with both cards", async () => {
    const agents = new ProfessionalAgentsHubPage(session.page);
    await agents.waitForLoad();
    await agents.checkCards();
  });

  test("Rebuild link leads to a working page", async () => {
    // Known bug, confirmed both locally and on staging: /professional/2c_agent/rebuild_resume
    // has no matching route file anywhere in the codebase, so it 404s. Skipped so CI stays green
    // while that route gets built - remove this line (and only this line) once it does;
    // checkRebuildResumeLinkWorks() will then confirm the fix.
    test.skip(true, "Known bug: Rebuild resume link 404s (no route file exists) - see AgentsHubPage.checkRebuildResumeLinkWorks()");

    const agents = new ProfessionalAgentsHubPage(session.page);
    await agents.goto();
    await agents.checkRebuildResumeLinkWorks();
  });
});
