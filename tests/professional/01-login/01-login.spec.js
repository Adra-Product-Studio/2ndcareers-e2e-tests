// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage, AUTH_FILE } = require("../../../support/sharedPage");
const { LoginPage } = require("../../../pages/LoginPage");
const { waitForApiDataMulti } = require("../../../support/apiEnvelope");
const { reapplyChatbotGuard } = require("../../../support/chatbotGuard");
const { credentialsFor } = require("../../../fixtures/credentials");

/**
 * Runs first (numbered 01) so its saved storageState (AUTH_FILE) exists before every other
 * file's beforeAll loads it - see support/sharedPage.js. This file itself needs a clean,
 * logged-out context, so it opts out of the default "start authenticated" behavior.
 */
test.describe("Professional - login", () => {
  const session = useSharedPage(test, { authenticated: false });
  const { email, password, redirectPath, hasCredentials } = credentialsFor("professional");

  test("shows the sign-in form", async () => {
    const page = session.page;
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test("empty submit shows validation errors", async () => {
    const page = session.page;
    const loginPage = new LoginPage(page);
    await loginPage.submit();

    await expect(loginPage.emailRequiredError).toBeVisible();
    await expect(loginPage.passwordRequiredError).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("invalid credentials are rejected with the correct error envelope", async () => {
    const page = session.page;
    const loginPage = new LoginPage(page);
    const body = await loginPage.submitInvalidAndWaitForFailure({
      email: "not-a-real-professional@2ndcareers.com",
      password: "wrong-password-123",
    });

    expect(body.success).toBe(false);
    expect(body.error_code).toBe(401);
    expect(body.message.length).toBeGreaterThan(0);

    await expect(loginPage.signInButton).toBeEnabled({ timeout: 10000 });
    await expect(page).toHaveURL(/\/$/);
  });

  test("valid credentials log in and return the expected access token + role", async () => {
    test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this.");

    const page = session.page;
    const loginPage = new LoginPage(page);
    await loginPage.fillCredentials({ email, password });

    // Captures /login itself PLUS the 3 calls the post-login redirect to Home fires as it mounts
    // for the very first time this session (the page's own 2 calls, plus the header's - which,
    // being part of a persistent layout, never fires again on a later same-session client
    // transition back to Home, confirmed live). This is the ONLY point in the whole suite where
    // that first-mount moment can actually be observed - every later file that returns to Home
    // via a nav-link click (03-home.spec.js) finds Next.js's client router cache serving the
    // already-mounted page without a new request at all (also confirmed live: the UI renders
    // correctly with zero matching network activity), so this is captured here, once, instead.
    const [data, home, notifications, userDetails] = await waitForApiDataMulti(
      page,
      [/\/login$/, /\/professional_updated_home/, /\/professional_notifications/, /\/user_dashboard_details/],
      () => loginPage.submit()
    );

    expect(data).toHaveProperty("access_token");
    expect(typeof data.access_token).toBe("string");
    expect(data.access_token.length).toBeGreaterThan(20);
    expect(data.user_role).toBe("professional");
    expect(data).toHaveProperty("Registration_status");
    expect(data).toHaveProperty("payment_status");
    expect(data).toHaveProperty("pricing_category");

    const homeData = Array.isArray(home) ? home[0] : home;
    expect(typeof homeData.user_name).toBe("string");
    expect(homeData.user_name.length).toBeGreaterThan(0);
    expect(typeof homeData.profile_percentage).toBe("number");
    expect(Array.isArray(homeData.applied_jobs)).toBe(true);
    expect(Array.isArray(homeData.learning_posts)).toBe(true);
    expect(Array.isArray(homeData.community_list)).toBe(true);
    expect(Array.isArray(notifications)).toBe(true);
    expect(typeof userDetails.notification_count).toBe("number");
    expect(userDetails.user_details[0]).toHaveProperty("email_id");
    expect(userDetails.user_details[0].user_role).toBe("professional");

    // A cold local dev server can still be compiling /professional/home on first visit.
    await expect(page).toHaveURL(new RegExp(redirectPath.replace(/\//g, "\\/")), { timeout: 45000 });

    // The "Navi" chatbot (app/_chatbot/page.js) auto-opens itself in a maximized overlay via a
    // one-shot 15-second timer armed right after login (services/auth/index.js), cleared once
    // Home finishes loading (services/professional/index.js) - a race that CI's own PW_SLOWMO
    // pacing (and a real backend, not localhost) can make the timer win instead. Confirmed live
    // (both locally and on CI) that once it opens, its `.chatbot_container.open` subtree
    // intercepts pointer events for the WHOLE viewport, not just where its card is drawn, and
    // every click for the rest of this suite's one continuous session then hangs retrying
    // against that invisible blocker until the test timeout - it never closes on its own, and
    // this suite deliberately never does the one thing that does reset it (a hard reload).
    // addStyleTag here (not addInitScript on the context) is deliberate: confirmed live, Next.js
    // replaces the whole document again a moment after this very first load finishes (a second
    // "framenavigated" fires ~50ms after the load event, wiping any earlier addInitScript-injected
    // DOM/state) - but NOT on any later client-side nav-link transition, so injecting once here,
    // after that settles (this test has already waited out a full login+redirect network
    // round-trip, well past that ~50ms window), survives for the rest of the session - UNLESS
    // something later deliberately reloads or re-navigates (a fresh document, same as this one
    // was), which wipes it out the same way - confirmed live, that's exactly what was happening
    // in 03-home's own response-mocking/cookie-simulation tests before they started calling
    // reapplyChatbotGuard() again themselves after each of their own reloads.
    await reapplyChatbotGuard(page);

    // Every other file's beforeAll (support/sharedPage.js) loads this to start pre-authenticated.
    await page.context().storageState({ path: AUTH_FILE });
  });
});
