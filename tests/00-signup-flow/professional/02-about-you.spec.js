// @ts-check
const { test, expect } = require("@playwright/test");
const { useSignupSharedPage } = require("../../../support/signupSharedPage");
const { AboutYouPage } = require("../../../pages/signup/professional/AboutYouPage");
const { signupTestConfig } = require("../../../fixtures/signupCredentials");
const { generateAiProfile } = require("../../../fixtures/aiProfileGenerator");
const { state } = require("../../../support/signupState");

/** A different real phone number's worth of digits each run - only the length/format the real
 * react-phone-input-2 field validates against matters here, not the specific digits. */
function randomPhoneDigits() {
  let digits = "";
  for (let i = 0; i < 10; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}

const { hasConfig } = signupTestConfig();

/** Step 2 - About You. Only reachable because 02-new-user-signup.spec.js already completed step
 * 1 for real on this same continuous session - see AboutYouPage.js's own guard note. */
test.describe("Signup - About You (step 2)", () => {
  const session = useSignupSharedPage(test);
  test.skip(!hasConfig, "Set MAILINATOR_USERNAME / MAILINATOR_PASSWORD / SIGNUP_TEST_EMAIL_DOMAIN in .env.test to run the signup-flow suite.");

  test("shows every real field this step has", async () => {
    const aboutYou = new AboutYouPage(session.page);
    await aboutYou.checkPageChrome();
  });

  test("an empty form shows all 4 validation errors, and never calls the API", async () => {
    const aboutYou = new AboutYouPage(session.page);
    await aboutYou.checkEmptyFormShowsAllErrors();
  });

  test("typing a city without picking a real Google Places suggestion is rejected", async () => {
    const aboutYou = new AboutYouPage(session.page);
    await aboutYou.checkCityWithoutPickingSuggestionIsRejected();
  });

  test("a fully valid submission actually saves the details and moves to Your Career Story", async () => {
    test.setTimeout(60_000);
    // A unique persona per run (name/city/years of experience/summary) rather than the same
    // hardcoded "Playwright Tester, New York" every time - see fixtures/aiProfileGenerator.js.
    const profile = await generateAiProfile();
    state.firstName = profile.firstName;
    state.lastName = profile.lastName;
    state.city = profile.city;
    state.yearsOfExperience = profile.yearsOfExperience;
    state.aiSummary = profile.aiSummary;
    state.aiGenerated = profile.aiGenerated;

    const aboutYou = new AboutYouPage(session.page);
    await aboutYou.submitValid({ firstName: state.firstName, lastName: state.lastName, city: state.city, phoneDigits: randomPhoneDigits() });
    await expect(session.page.getByRole("heading", { name: "Your Career Story", exact: true })).toBeVisible();
  });
});
