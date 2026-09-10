// @ts-check
const { test, expect } = require("@playwright/test");
const { useSharedPage } = require("../../../support/sharedPage");
const { ProfessionalHomePage } = require("../../../pages/professional/home/HomePage");
const { reapplyChatbotGuard } = require("../../../support/chatbotGuard");
const { credentialsFor } = require("../../../fixtures/credentials");

const { hasCredentials } = credentialsFor("professional");

/**
 * This account sits at a fixed ~53% profile completion, so real data alone can never exercise
 * every branch of app/(routes)/professional/home/page.js's two profile_percentage conditionals:
 *   dynamic_profile_content(): `percentage < 60` -> below60 copy/CTA, else -> from60 copy/CTA
 *   render_jobs_carousel(): `percentage <= 30` -> stats cards; else `percentage >= 61 &&
 *     ai_job_details.length` -> Featured Jobs from ai_job_details, else -> Latest Jobs from
 *     applied_jobs (including >=61 with an EMPTY ai_job_details - a real fallback, not a bug)
 * Each case below intercepts the real GET /professional_updated_home response and overrides only
 * profile_percentage (plus whichever job/stat fields that branch actually reads) on top of the
 * real payload - see HomePage.mockHomeDataAndReload's doc comment. A page.reload() is what
 * actually applies each override - the one deliberate exception to this suite's "real clicks,
 * never a refresh" rule, since forcing a fresh request through the mock is the entire point.
 */
test.describe("Professional - Home - profile_percentage branches (mocked)", () => {
  const session = useSharedPage(test);
  test.skip(!hasCredentials, "Set PROFESSIONAL_TEST_EMAIL / PROFESSIONAL_TEST_PASSWORD in .env.test to run this - it needs 01-login to have signed in first.");

  test.afterAll(async () => {
    // Leaves no route handler behind for whatever runs next in this shared session/page.
    const home = new ProfessionalHomePage(session.page);
    await home.clearHomeMock();
  });

  test("<=30%: shows the stats-card row instead of a jobs carousel", async () => {
    const home = new ProfessionalHomePage(session.page);
    const stats = { total_jobs: 4241, total_professionals: 5352, total_employers: 6463, total_learning_posts: 7574 };
    await home.mockHomeDataAndReload({ profile_percentage: 25, ...stats });

    await home.checkDynamicProfileContent(25);
    await home.checkJobsCarouselBranch(25, { stats });
  });

  test("31-59%: below-60% CTA copy, Latest Jobs carousel from applied_jobs", async () => {
    const home = new ProfessionalHomePage(session.page);
    const sourceJobTitle = "E2E synthetic latest job - 45%";
    await home.mockHomeDataAndReload({
      profile_percentage: 45,
      ai_job_details: [],
      applied_jobs: [{ id: 1, job_title: sourceJobTitle, created_at: "2026-01-15T00:00:00Z" }],
    });

    await home.checkDynamicProfileContent(45);
    await home.checkJobsCarouselBranch(45, { sourceJobTitle });
  });

  test("exactly 59%: still the below-60% bucket - the boundary is a strict '< 60', confirmed by clicking through", async () => {
    const home = new ProfessionalHomePage(session.page);
    await home.mockHomeDataAndReload({ profile_percentage: 59 });

    // Only bucket-level checks click through to their real destination (below60's is a normal,
    // safe, already-covered page) - the specific percentage within a bucket doesn't change where
    // the CTA goes, so this is checked once per bucket, not once per percentage value in this file.
    await home.checkDynamicProfileContent(59, { clickThrough: true });
    await home.checkJobsCarouselBranch(59, {});
  });

  test("exactly 60%: crosses into the from-60% bucket, even though the carousel's own cutoff is 61", async () => {
    const home = new ProfessionalHomePage(session.page);
    await home.mockHomeDataAndReload({ profile_percentage: 60 });

    // The two conditionals use DIFFERENT cutoffs (dynamic_profile_content: <60, render_jobs_carousel:
    // >=61) - at exactly 60 they disagree: the CTA copy already reads as "looking strong" while the
    // carousel still shows Latest Jobs, not Featured. Both are checked together here specifically
    // to pin that disagreement down, not because it's a bug - it's what the real code does.
    await home.checkDynamicProfileContent(60);
    await home.checkJobsCarouselBranch(60, {});
  });

  test(">=61% with real ai_job_details: from-60% CTA copy, Featured Jobs carousel", async () => {
    const home = new ProfessionalHomePage(session.page);
    const sourceJobTitle = "E2E synthetic featured job - 75%";
    await home.mockHomeDataAndReload({
      profile_percentage: 75,
      ai_job_details: [{ id: 2, job_title: sourceJobTitle, created_at: "2026-01-20T00:00:00Z" }],
    });

    // The from-60% bucket's own CTA ("Explore learning" -> /professional/learning/hub/live_sessions)
    // is a known, pre-existing 404 (dead _learning/hub tree, confirmed live) - clicking through
    // here only confirms dynamic_profile_content() picks THAT path for this bucket, the same as
    // 59%'s click-through confirms the below-60% path; it deliberately doesn't assert the
    // destination page itself renders successfully, since it's already documented as broken.
    await home.checkDynamicProfileContent(75, { clickThrough: true });
    await home.checkJobsCarouselBranch(75, { aiJobsLength: 1, sourceJobTitle });

    // "Explore jobs" on a Featured-Jobs carousel routes to Recommended, not All Jobs - a real,
    // safe, already-covered destination, so this one carousel click-through is checked too.
    await home.exploreJobsButton.click();
    await home.page.waitForURL(/\/recommended_jobs/);
    await home.page.goto("/professional/home");
    await reapplyChatbotGuard(home.page);
  });

  test(">=61% with an EMPTY ai_job_details: still falls back to Latest Jobs from applied_jobs", async () => {
    const home = new ProfessionalHomePage(session.page);
    const sourceJobTitle = "E2E synthetic latest job - 75% fallback";
    await home.mockHomeDataAndReload({
      profile_percentage: 75,
      ai_job_details: [],
      applied_jobs: [{ id: 3, job_title: sourceJobTitle, created_at: "2026-01-25T00:00:00Z" }],
    });

    await home.checkJobsCarouselBranch(75, { aiJobsLength: 0, sourceJobTitle });
    await expect(home.exploreJobsButton).toBeVisible();
  });
});
