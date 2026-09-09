// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { HeaderMenu } = require("../../../pages/professional/shared/HeaderMenu");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * Checks the profile dropdown's own links WITHOUT navigating anywhere - unlike an earlier version
 * of this file, this deliberately does NOT click through Home -> Jobs -> Learning -> Agents (or
 * sign out) as a "does nav work at all" sanity check before the real per-page chapters run.
 * Confirmed live: Next.js's client router cache can serve an already-visited route with NO new
 * matching network request at all (the UI still renders correctly - it's just served from cache),
 * so a page visited here first would silently break every later chapter's own fresh-data check
 * when it tries to arrive at that SAME page via its own nav-link click (04-jobs, 05-learning,
 * 06-agents all rely on their click being that page's very first visit this session). Each
 * chapter's own real click-based entry already proves nav-link transitions work (no full reload,
 * real data fetched) - a separate up-front pass isn't needed and actively causes that bug, so it
 * doesn't touch Home/Jobs/Learning/Agents at all. Sign out is the very last thing the whole suite
 * does, in 11-upgrade.spec.js.
 */
test.describe("Professional - top-level navigation via header links", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test("profile dropdown lists My Profile / Upgrade / Help / Get Support / Sign out, without navigating away yet", async () => {
    const header = new HeaderMenu(session.page);
    await header.checkProfileMenuLinks();
    // The same button toggles the dropdown open/closed (see HeaderMenu.js) - close it back down
    // rather than leaving it open, so the next chapter (03-home) starts from a plain page.
    await header.profileMenuButton.click();
    await expect(header.myProfileLink).toBeHidden();
  });
});
