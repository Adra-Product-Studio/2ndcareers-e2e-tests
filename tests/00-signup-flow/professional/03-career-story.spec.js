// @ts-check
const { test, expect } = require("@playwright/test");
const { useSignupSharedPage } = require("../../../support/signupSharedPage");
const { CareerStoryPage } = require("../../../pages/signup/professional/CareerStoryPage");
const { signupTestConfig } = require("../../../fixtures/signupCredentials");
const { state } = require("../../../support/signupState");

const { hasConfig } = signupTestConfig();

/** Step 3 - Your Career Story, the final signup step. Resume upload is genuinely optional
 * (confirmed live and in the real code - see CareerStoryPage.js) so this deliberately completes
 * the flow without one, the simplest real path a person can take. */
test.describe("Signup - Your Career Story (step 3)", () => {
  const session = useSignupSharedPage(test);
  test.skip(!hasConfig, "Set MAILINATOR_USERNAME / MAILINATOR_PASSWORD / SIGNUP_TEST_EMAIL_DOMAIN in .env.test to run the signup-flow suite.");

  test("shows every real field this step has, resume upload marked optional", async () => {
    const careerStory = new CareerStoryPage(session.page);
    await careerStory.checkPageChrome();
  });

  test("an empty form shows all 4 validation errors, and never calls the API", async () => {
    const careerStory = new CareerStoryPage(session.page);
    await careerStory.checkEmptyFormShowsAllErrors();
  });

  test("a fully valid submission with no resume still succeeds and reaches Signup Success", async () => {
    const careerStory = new CareerStoryPage(session.page);
    // AboutYouPage's own step already generated this run's unique persona (see
    // fixtures/aiProfileGenerator.js) - reusing its years_of_experience here keeps one persona
    // consistent across both steps instead of a second, unrelated hardcoded number.
    const yearsOfExperience = state.yearsOfExperience || 5;
    const { industry, sector, functionalRole } = await careerStory.submitValid(yearsOfExperience);
    expect(industry.length).toBeGreaterThan(0);
    expect(sector.length).toBeGreaterThan(0);
    expect(functionalRole.length).toBeGreaterThan(0);
    await expect(session.page.getByText("You’re almost there!", { exact: true })).toBeVisible();
  });
});
