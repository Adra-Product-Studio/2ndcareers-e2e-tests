// @ts-check
const { test, expect } = require("@playwright/test");
const { useSignupSharedPage } = require("../../../support/signupSharedPage");
const { SignupSuccessPage } = require("../../../pages/signup/professional/SignupSuccessPage");
const { MailinatorPage } = require("../../../pages/mailinator/MailinatorPage");
const { signupTestConfig } = require("../../../fixtures/signupCredentials");
const { state } = require("../../../support/signupState");

const { hasConfig, mailinatorUsername, mailinatorPassword } = signupTestConfig();

/**
 * The one deliberate real page.goto() in this flow (mailinator.com, then back to this app's own
 * login) - there's no in-app click path to a third-party mail provider, and logging in is by
 * definition a fresh, unauthenticated page load. Verifies the REAL email 2nd Careers sends and
 * the REAL backend verification link it contains (services/auth/index.js's signup flow, a
 * devapi.2ndcareers.com link, not a frontend route - confirmed live) - no mocking anywhere in
 * this file, the whole point is proving the real thing works end to end.
 */
test.describe("Signup - email verification (Mailinator) and first login", () => {
  const session = useSignupSharedPage(test);
  test.skip(!hasConfig, "Set MAILINATOR_USERNAME / MAILINATOR_PASSWORD / SIGNUP_TEST_EMAIL_DOMAIN in .env.test to run the signup-flow suite.");

  test("Signup Success shows the real 'check your inbox' state for this new account", async () => {
    const signupSuccess = new SignupSuccessPage(session.page);
    await signupSuccess.checkCheckInboxState(state.email);
  });

  test("the real verification email arrives in Mailinator and its link verifies the account", async () => {
    // Generous headroom over MailinatorPage's own 150s wait budget - confirmed live, repeatedly,
    // that real delivery to this mail service sometimes takes close to that long on its own.
    test.setTimeout(200_000);
    const ownLocalPart = state.email.split("@")[0];
    expect(ownLocalPart.length).toBeGreaterThan(0);

    const mailinator = new MailinatorPage(session.page);
    await mailinator.login(mailinatorUsername, mailinatorPassword);
    const verificationLink = await mailinator.getVerificationLink(ownLocalPart);
    expect(verificationLink).toContain("email_verification");

    await session.page.goto(verificationLink);
    await expect(session.page.getByText("Email Successfully Verified!", { exact: true })).toBeVisible();
    state.emailVerifiedOn = new Date().toISOString();
  });

  test("the newly verified account can log in for real, landing on its own Home page", async () => {
    // A fresh, logged-out load of this app - the Mailinator detour above navigated this same
    // shared page away entirely, so there's no session/cookie state left over to clear first.
    await session.page.goto("/");
    await session.page.locator('input[name="email"]').fill(state.email);
    await session.page.locator('input[name="password"]').fill(state.password);

    // Both captured together, not the login response alone then a separate waitForURL - the
    // client-side redirect can land before /professional_updated_home's own response arrives, and
    // 06-first-time-home.spec.js (a later file, its own network activity long finished by the
    // time it runs) needs THIS real response's profile_percentage, not a fresh one of its own.
    // Also captures /get_checkout_status (best-effort - a later component's own fetch, not this
    // page's own click target) here rather than in file 06: it's the real response whose success
    // handler (services/auth/index.js's handle_get_checkout_status, fired from the shared
    // professional header's own mount effect - store/project_log_store.js's useRoleBasedUserDetails
    // is what reads its result) is what actually populates project_log.professional.email_id -
    // confirmed live, by replaying the overlay's exact real request with only email_id filled in
    // and getting error_code 0 back. The header mounts at the same time as Home, so this response
    // is in flight around the same moment as login's own redirect, not something that already
    // happened before we started waiting for it.
    const [loginResponse, homeResponse] = await Promise.all([
      session.page.waitForResponse(/\/login/, { timeout: 15_000 }),
      session.page.waitForResponse(/\/professional_updated_home/, { timeout: 15_000 }),
      session.page.waitForResponse(/\/get_checkout_status/, { timeout: 15_000 }).catch(() => null),
      session.page.getByRole("button", { name: "Sign in Securely" }).click(),
    ]);
    const loginJson = await loginResponse.json();
    expect(loginResponse.ok()).toBe(true);
    expect(loginJson.error_code).toBe(0);

    const homeJson = await homeResponse.json();
    const homeData = Array.isArray(homeJson?.data) ? homeJson.data[0] : homeJson?.data;
    state.profilePercentage = typeof homeData?.profile_percentage === "number" ? homeData.profile_percentage : null;

    await session.page.waitForURL(/\/professional\/home/, { timeout: 15_000 });
    await expect(session.page.getByRole("heading", { name: "2nd Career Pathways" })).toBeVisible();
    // A settle buffer, not a fixed replacement for the wait above - the response arriving doesn't
    // guarantee the app's own .then handler (the actual set_project_log_cookie call) has finished
    // running yet.
    await session.page.waitForTimeout(500);
  });
});
