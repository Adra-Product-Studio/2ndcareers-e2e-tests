// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../support/sharedPage");
const { ProfessionalLearningPage } = require("../../pages/professional/LearningPage");
const { credentialsFor } = require("../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

test.describe("Professional - learning", () => {
  const session = useSharedPage(test, { videoName: "04-learning" });
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login.spec.js to have signed in first.");

  test("loads training/event postings with the expected keys and values", async () => {
    const learning = new ProfessionalLearningPage(session.page);
    const postings = await learning.gotoAndLoad();

    expect(Array.isArray(postings)).toBe(true);
    for (const posting of postings) {
      expect(posting.title.trim().length).toBeGreaterThan(0);
      expect(typeof posting.type_of_offering).toBe("string");
      expect(["paid", "unpaid"]).toContain(posting.type_of_event);
    }
  });
});
