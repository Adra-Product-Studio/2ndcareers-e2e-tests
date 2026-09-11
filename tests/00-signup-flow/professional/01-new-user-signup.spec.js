// @ts-check
const { test, expect } = require("@playwright/test");
const { useSignupSharedPage } = require("../../../support/signupSharedPage");
const { NewUserSignupPage } = require("../../../pages/signup/professional/NewUserSignupPage");
const { generateSignupEmail, signupTestConfig } = require("../../../fixtures/signupCredentials");
const { state } = require("../../../support/signupState");

const { hasConfig } = signupTestConfig();
const VALID_PASSWORD = "TestPass123!";

/**
 * Step 1 - New User Signup. validate/professional_signup.js's NewUserSignupValidation runs all 5
 * checks (email/password/confirm/terms/age) in one pass via validator_error_send, which blocks
 * the request entirely on any failure (confirmed live - see NewUserSignupPage.js) - every check
 * below asserts BOTH the visible error text AND that no /professional_register request fired, not
 * just one or the other.
 */
test.describe("Signup - New User Signup (step 1)", () => {
  const session = useSignupSharedPage(test);
  test.skip(!hasConfig, "Set MAILINATOR_USERNAME / MAILINATOR_PASSWORD / SIGNUP_TEST_EMAIL_DOMAIN in .env.test to run the signup-flow suite.");

  test("shows every step, input, and checkbox this page really has", async () => {
    const signup = new NewUserSignupPage(session.page);
    await signup.checkPageChrome();
  });

  test("an empty form shows all 5 validation errors at once, and never calls the API", async () => {
    const signup = new NewUserSignupPage(session.page);
    await signup.checkEmptyFormShowsAllErrors();
  });

  test("an invalid email format is rejected", async () => {
    const signup = new NewUserSignupPage(session.page);
    await signup.checkInvalidEmailFormat();
  });

  test("a password that doesn't meet the real complexity rule is rejected", async () => {
    const { email } = generateSignupEmail();
    const signup = new NewUserSignupPage(session.page);
    await signup.checkWeakPassword(email);
  });

  test("a valid email/password but an empty Confirm Password is rejected", async () => {
    const { email } = generateSignupEmail();
    const signup = new NewUserSignupPage(session.page);
    await signup.checkEmptyConfirmPassword(email);
  });

  test("a Confirm Password that doesn't match Password is rejected", async () => {
    const signup = new NewUserSignupPage(session.page);
    await signup.checkMismatchedConfirmPassword();
  });

  test("valid, matching passwords but neither checkbox ticked shows both checkbox errors", async () => {
    const { email } = generateSignupEmail();
    const signup = new NewUserSignupPage(session.page);
    await signup.checkMissingCheckboxes(email, VALID_PASSWORD);
  });

  test("a fully valid submission actually creates the account and moves to About You", async () => {
    const { email } = generateSignupEmail();
    state.email = email;
    state.password = VALID_PASSWORD;

    const signup = new NewUserSignupPage(session.page);
    const json = await signup.submitValid(email, VALID_PASSWORD);
    state.createdOn = new Date().toISOString();
    // Confirmed live - the same message step 3 (Your Career Story) also returns; About You
    // (step 2) is the one step with its own distinct message ("Professional Account created
    // successfully").
    expect(json.message).toBe("Your Professional Account details were added successfully");
    await expect(session.page.getByRole("heading", { name: "About you", exact: true })).toBeVisible();
  });
});
