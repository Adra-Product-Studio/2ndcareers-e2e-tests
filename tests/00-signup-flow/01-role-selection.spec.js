// @ts-check
const { test, expect } = require("@playwright/test");
const { useSignupSharedPage } = require("../../support/signupSharedPage");
const { RoleSelectionPage } = require("../../pages/signup/RoleSelectionPage");
const { signupTestConfig } = require("../../fixtures/signupCredentials");

const { hasConfig } = signupTestConfig();

/**
 * The public entry point into signup: the login page's own "New to 2nd Careers? Sign up now"
 * link, then the role selection page it leads to (3 real cards, each a genuine router.push into
 * that role's own signup wizard - see RoleSelectionPage.js).
 */
test.describe("Signup - role selection", () => {
  const session = useSignupSharedPage(test);
  test.skip(!hasConfig, "Set MAILINATOR_USERNAME / MAILINATOR_PASSWORD / SIGNUP_TEST_EMAIL_DOMAIN in .env.test to run the signup-flow suite.");

  test("the login page's 'Sign up now' link leads to role selection, showing all 3 real role cards", async () => {
    const roleSelection = new RoleSelectionPage(session.page);
    await roleSelection.goto();
    await roleSelection.checkAllRoleCards();
  });

  test("choosing Professional leads into its own signup wizard", async () => {
    const roleSelection = new RoleSelectionPage(session.page);
    await roleSelection.chooseProfessional();
    await expect(session.page.getByRole("heading", { name: "New User Signup", exact: true })).toBeVisible();
  });
});
