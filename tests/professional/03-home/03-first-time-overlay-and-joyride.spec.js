// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalProfileOverlay } = require("../../../pages/professional/home/ProfileOverlay");
const { ProfessionalHomeJoyRide } = require("../../../pages/professional/home/JoyRide");
const { captureProjectLogCookie, restoreProjectLogCookie } = require("../../../support/cookies");
const { mockApiField, clearMock } = require("../../../support/mockResponse");
const { reapplyChatbotGuard } = require("../../../support/chatbotGuard");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * The real first-time-user signal (confirmed against the actual source, services/professional/
 * index.js's handle_get_professional_home): GET /professional_updated_home returning
 * `error_code: 200` instead of the normal `0` - the comment right there in the real code reads
 * "200 error_code is for [joy ride / resume parsing]". On that branch, and ONLY that branch, the
 * app writes `show_profile_overlay`, `show_home_joy_ride`, and `show_profile_joy_ride` all to
 * true in the project_log cookie:
 *
 *   if (data?.error_code === 200) {
 *     set_project_log_cookie({ professional: {
 *       show_profile_overlay: true, show_home_joy_ride: true, show_profile_joy_ride: true,
 *     }});
 *     clearTimeout(chatbot_data.chatbot_timeout_interval)
 *   }
 *
 * The header then opens the Profile overlay modal off `show_profile_overlay`
 * (components/reusable_page/professional_header/index.js), and completing it (its only two exit
 * buttons, "Confirm"/"Edit Profile", both submit - see ProfileOverlay.js) leaves
 * `show_home_joy_ride` as the only remaining gate on Home's JoyRide tour.
 *
 * This account is a real, long-lived, already-onboarded account - it never actually gets a 200
 * from a real backend on this endpoint, and there's no backend reset for that. What's exercised
 * here is the frontend's own reaction to that response, triggered exactly the way the app itself
 * checks for it: intercepting the real GET /professional_updated_home response and changing only
 * its `error_code` to 200 (support/mockResponse.js - same real-request-then-modify approach as
 * 02-percentage-branches.spec.js, so the actual `data` payload is untouched and genuine), not by
 * writing the resulting cookie fields directly. The project_log cookie is still captured before
 * and restored via context.addCookies() after (support/cookies.js) - the app's own real code runs
 * for real here and does persist those fields, so this account's true state is never left changed.
 */
test.describe("Professional - Home - first-time-user overlay -> JoyRide", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  const HOME_ENDPOINT = /\/professional_updated_home/;
  let originalCookie;

  test("a 200 error_code on /professional_updated_home (first-time login) opens the Profile overlay", async () => {
    const page = session.page;
    originalCookie = await captureProjectLogCookie(page.context());

    // Defensive clean slate - cheap insurance against any handler some earlier file left behind
    // on this shared page (its own afterAll should already have unrouted it, but this costs
    // nothing and rules the possibility out entirely).
    await page.unrouteAll({ behavior: "ignoreErrors" });

    await mockApiField(page, HOME_ENDPOINT, (json) => {
      json.error_code = 200;
      return json;
    });
    // The mocked response is what actually drives this - a reload (not a nav-link click) is what
    // forces a fresh request through it, same class of deliberate exception as
    // 02-percentage-branches.spec.js's mocked reloads. Confirmed live (reproduced directly,
    // outside any test, with logging on every handler invocation): route.fetch()'s real network
    // round-trip here regularly takes longer than reload() itself does to resolve (reload only
    // waits for the `load` event, not for this handler's own fulfill() to land) - unrouting
    // right after a bare `await page.reload()` reliably raced this handler's still-in-flight
    // route.fetch(), and Playwright auto-resolves an orphaned in-flight route the moment its
    // handler is unrouted out from under it - so THIS code's own later route.fulfill() call was
    // always doomed to find the route already handled. Waiting for the real mocked response
    // itself (same fix HomePage.mockHomeDataAndReload() already uses) guarantees fulfill() has
    // actually completed before anything below can unroute it.
    const [response] = await Promise.all([page.waitForResponse(HOME_ENDPOINT, { timeout: 30_000 }), page.reload()]);
    expect(response.ok()).toBe(true);
    // A reload is a fresh document, so it drops 01-login.spec.js's chatbot-neutralizing style the
    // same way - reapplied here for the same reason HomePage.mockHomeDataAndReload() does.
    await reapplyChatbotGuard(page);
    // One-shot - nothing else in this file needs another /professional_updated_home response to
    // also carry error_code 200 (a second real request, e.g. from a later reload, should behave
    // like any other normal load). Safe to unroute now - the response awaited above only resolves
    // once this handler's own fulfill() has already completed.
    await clearMock(page, HOME_ENDPOINT);

    const overlay = new ProfessionalProfileOverlay(page);
    await overlay.waitForOpen();
  });

  test("completing the overlay (without a real submission) closes it and reveals the JoyRide", async () => {
    const page = session.page;
    const overlay = new ProfessionalProfileOverlay(page);
    await overlay.completeSafely();

    // No reload here: closing the overlay updates the SAME in-memory project_log store the
    // JoyRide gate reads (`show_home_joy_ride && !show_profile_overlay`, app/(routes)/professional/
    // home/page.js) - confirmed live, React re-renders off that state change alone.
    const joyRide = new ProfessionalHomeJoyRide(page);
    await joyRide.waitForFirstStep();
  });

  test("clicking through every JoyRide step closes the tour", async () => {
    const joyRide = new ProfessionalHomeJoyRide(session.page);
    await joyRide.completeAll();
  });

  test.afterAll(async () => {
    // Restores this real account's project_log cookie to exactly what it was before this file
    // touched it, regardless of what the overlay/JoyRide's own real completion code wrote in the
    // meantime - this always runs, including if an assertion above failed partway through.
    await restoreProjectLogCookie(session.page.context(), originalCookie);
    await session.page.goto("/professional/home");
    await reapplyChatbotGuard(session.page);
    await expect(session.page.getByRole("heading", { name: "2nd Career Pathways" })).toBeVisible();
  });
});
