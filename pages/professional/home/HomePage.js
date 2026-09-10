// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiDataMulti } = require("../../../support/apiEnvelope");
const { mockApiField, clearMock } = require("../../../support/mockResponse");
const { reapplyChatbotGuard } = require("../../../support/chatbotGuard");

const HOME_ENDPOINT = /\/professional_updated_home/;

// Keyed by the underlying Playwright `page` (not by ProfessionalHomePage instance - a new one is
// constructed per test() call, see mockHomeDataAndReload()'s own doc comment for why that matters
// for the route-handler-registration guard below).
const homeMockState = new WeakMap();

/**
 * The below-60%/60-and-over CTA copy from json/json_data/professional/index.js's
 * `professional_home_percentage_contents` (60/61 are the object's own literal keys, not exact
 * percentage cutoffs - see dynamic_profile_content()'s real condition below).
 */
const PERCENTAGE_CONTENT = {
  below60: {
    text: "Your profile is less than 60% complete - finish it to boost your visibility and get discovered by employers",
    buttonName: "Complete profile",
    buttonPath: "/professional/profile",
  },
  from60: {
    text: "Your profile is looking strong. Stay engaged through events, learning.",
    buttonName: "Explore learning",
    // Known, pre-existing bug (not introduced or fixed here): this route only exists inside the
    // dead _learning/hub tree and 404s - confirmed live. Asserted as a documented fact below, the
    // same pattern AgentsHubPage.checkRebuildResumeLinkWorks() uses for its own known-404 link.
    buttonPath: "/professional/learning/hub/live_sessions",
  },
};

/**
 * /professional/home. Loads via GET /professional_updated_home - captured live, see
 * e2e-tests/README.md. `data.data` is a single-element array (`data.data[0]`, confirmed against
 * services/professional/index.js's handle_get_professional_home) holding this page's own fields:
 * user_name, profile_percentage, ai_job_details, applied_jobs, total_jobs, total_professionals,
 * total_employers, total_learning_posts, learning_posts, community_list.
 *
 * GET /professional_notifications (the bell dropdown) and GET /user_dashboard_details (name/
 * avatar) are NOT this page's own calls - both are fetched by components living in the shared
 * header layout (components/Notification/index.js and the header itself), which mounts once per
 * browser session and never remounts on a same-section client transition (confirmed live) - so
 * neither ever fires again just because Home happens to be the page you're looking at. Both are
 * captured once, at the point they actually happen (the post-login redirect) - see
 * tests/professional/01-login/01-login.spec.js.
 */
class ProfessionalHomePage {
  constructor(page) {
    this.page = page;
    this.pathwaysHeading = page.getByRole("heading", { name: "2nd Career Pathways" });
    this.communityCard = page.getByRole("button", { name: /COMMUNITY/ });
    this.profileSuggestionParagraph = page.getByText(/Your profile is (less than 60% complete|looking strong)/);
    this.jobsOpenNowHeading = page.getByText("Jobs Open Now");
    this.latestJobsHeading = page.getByRole("heading", { name: "Latest Jobs" });
    this.featuredJobsHeading = page.getByRole("heading", { name: "Featured Jobs" });
    this.exploreJobsButton = page.getByRole("button", { name: "Explore jobs", exact: true });
  }

  /** Plain navigation for UI-only checks that don't need to re-validate the API call. */
  async goto() {
    await this.page.goto("/professional/home");
    await expect(this.pathwaysHeading).toBeVisible();
  }

  /**
   * Validates the page's own API call in one pass, PLUS GET /professional_notifications and
   * GET /user_dashboard_details - only true the very first time the shared header mounts this
   * session (see class doc comment above for why); exercised via the post-login redirect in
   * 01-login.spec.js, which is the only place this method is actually called with no override.
   * Confirmed live: returning to an already-visited route via a nav-link click later in the same
   * session can be served entirely from Next.js's client router cache with NO new matching
   * request at all, even though the page renders fully correct content - use checkAlreadyLoaded()
   * for that case instead of this one.
   */
  async waitForLoad(action = () => this.page.goto("/professional/home")) {
    const patterns = [HOME_ENDPOINT, /\/professional_notifications/, /\/user_dashboard_details/];
    const [homeData, notifications, userDetails] = await waitForApiDataMulti(this.page, patterns, action);

    const home = Array.isArray(homeData) ? homeData[0] : homeData;
    expect(typeof home.user_name).toBe("string");
    expect(home.user_name.length).toBeGreaterThan(0);
    expect(typeof home.profile_percentage).toBe("number");
    expect(Array.isArray(home.applied_jobs)).toBe(true);
    expect(Array.isArray(home.learning_posts)).toBe(true);
    expect(Array.isArray(home.community_list)).toBe(true);

    expect(Array.isArray(notifications)).toBe(true);
    for (const item of notifications) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("msg");
      expect(item).toHaveProperty("created_at");
      expect(item).toHaveProperty("view_status");
    }

    expect(typeof userDetails.notification_count).toBe("number");
    expect(Array.isArray(userDetails.user_details)).toBe(true);
    expect(userDetails.user_details[0]).toHaveProperty("email_id");
    expect(userDetails.user_details[0].user_role).toBe("professional");

    await expect(this.pathwaysHeading).toBeVisible();
    return { home, notifications, userDetails };
  }

  /**
   * For returning to Home later in the same session (e.g. a header nav-link click from another
   * page) once it's already been loaded once - see waitForLoad()'s doc comment for why that
   * doesn't reliably produce a fresh, observable network call to wait on. Checks the rendered
   * content directly instead, including the SAME below-60%/above-30% conditional copy
   * waitForLoad()'s caller would otherwise have read out of the raw JSON (see
   * app/(routes)/professional/home/page.js's dynamic_profile_content/render_jobs_carousel) -
   * checkCards() below only actually renders this way at this account's real ~53% completion.
   */
  async checkAlreadyLoaded(action) {
    if (action) await action();
    await expect(this.pathwaysHeading).toBeVisible();
    await this.checkCards();
  }

  async checkCards() {
    // exact: true throughout this method - several cards are themselves role="button" divs
    // wrapping a heading/paragraph/inner button, so their computed accessible name is the
    // concatenation of ALL of that nested text (e.g. the Career Copilots card's name includes
    // its own "Get Started" button text) - a substring match would hit the wrapper too.
    await expect(this.page.getByRole("button", { name: "2nd Careers in Impact", exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "AI for Boards", exact: true })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Complete profile", exact: true })).toBeVisible();
    await expect(this.latestJobsHeading).toBeVisible();
    await expect(this.exploreJobsButton).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Apply", exact: true }).first()).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "2C Copilots" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Get Started", exact: true })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "2C Atlas" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "2C Upskill" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "2C Exchange" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Founders' Message" })).toBeVisible();
    await expect(this.page.getByText("Take a tour of our platform")).toBeVisible();
  }

  /**
   * The home dashboard's "COMMUNITY" quick-access card opens https://app.2ndcareers.com in a
   * NEW TAB (verified live via browser_tabs - not an in-app route, despite looking like one).
   * This one really is purely external - but the header's own top-nav "Community" link is NOT
   * (found via code, not assumed): it also fires a real router.push to the internal
   * /professional/community page on the same click, alongside opening Discourse in a new tab -
   * see HeaderMenu.js's communityNavLink/goToCommunity() and tests/professional/08-community.
   * This catches the popup instead of following it, leaving the main page/session untouched.
   */
  async checkCommunityCardOpensExternalApp() {
    const [popup] = await Promise.all([this.page.waitForEvent("popup"), this.communityCard.click()]);
    await popup.waitForLoadState();
    expect(popup.url()).toContain("app.2ndcareers.com");
    await popup.close();
  }

  /**
   * This account sits at a fixed ~53% profile completion - real data can never exercise the
   * <=30% stats-card branch, the >=60%/>=61% "looking strong"/Featured-Jobs branches, or the
   * exact 60% boundary, all real conditionals in app/(routes)/professional/home/page.js
   * (dynamic_profile_content, render_jobs_carousel). Rather than leave those undocumented gaps,
   * this intercepts the real GET /professional_updated_home response and overrides just
   * `profile_percentage` (plus whichever job/stat fields that percentage's branch actually reads)
   * on top of the real payload - every other field the page might read is still genuine backend
   * data, only the field(s) under test are synthetic. A page.reload() (not a nav-link click) is
   * what actually applies it: this is the one place in the suite that reloads by design, since
   * the whole point is forcing a fresh request through the mock rather than relying on whatever's
   * already rendered.
   */
  async mockHomeDataAndReload(overrides) {
    // The route handler itself is registered only ONCE per underlying page (idempotent - see the
    // guard below, keyed in homeMockState since a NEW ProfessionalHomePage is constructed for
    // every test() call, see e.g. 02-percentage-branches.spec.js - an instance property here
    // would reset on every call and miss its own guard). Each call just updates `overrides` in
    // that shared state; the one registered handler reads whatever's current at request time.
    // Re-registering a new page.route() handler per call (unroute then route again) raced a
    // still-in-flight request from the PREVIOUS call's own reload/click-through navigations
    // against the newly (re)routed handler - confirmed live: "Route is already handled!" - since
    // a table of percentage values is exactly this method's real use case, calling it repeatedly
    // in a row (across separate test()s, on the same underlying page) had to be safe.
    let state = homeMockState.get(this.page);
    if (!state) {
      state = { overrides };
      homeMockState.set(this.page, state);
      // Defensive: guards against a route handler left behind by some OTHER, earlier one-off
      // page.route() call on this same page/pattern that hasn't finished unrouting yet - confirmed
      // live this can otherwise throw "Route is already handled!" on the very next request.
      await this.page.unrouteAll({ behavior: "ignoreErrors" });
      await mockApiField(this.page, HOME_ENDPOINT, (json) => {
        const body = Array.isArray(json.data) ? json.data[0] : json.data;
        Object.assign(body, state.overrides);
        return json;
      });
    } else {
      state.overrides = overrides;
    }
    // pathwaysHeading (below) is static markup, rendered regardless of data.loading - it can't be
    // used to confirm the MOCKED response actually landed, only that the page frame did. Waiting
    // for the real response here (not just reload() resolving, which only waits for the load
    // event - confirmed live, a slower-than-usual backend round trip left the mocked data still
    // in flight well after that) is what actually guarantees the percentage override is visible
    // before the caller starts asserting on it.
    const [response] = await Promise.all([this.page.waitForResponse(HOME_ENDPOINT, { timeout: 30_000 }), this.page.reload()]);
    expect(response.ok()).toBe(true);
    // A reload is a fresh document - it silently drops the chatbot-neutralizing style injected
    // once in 01-login.spec.js (confirmed live: that's exactly what reopened the chatbot-blocks-
    // clicks bug at 04-jobs, several files after this one, the first time this method's reloads
    // shipped without this call).
    await reapplyChatbotGuard(this.page);
    await expect(this.pathwaysHeading).toBeVisible();
  }

  /** Stops intercepting the home endpoint - real data resumes on the next request. */
  async clearHomeMock() {
    if (!homeMockState.has(this.page)) return;
    await clearMock(this.page, HOME_ENDPOINT);
    homeMockState.delete(this.page);
  }

  /**
   * Verifies dynamic_profile_content()'s exact copy/button/destination for whichever bucket
   * `percentage` falls into (the real condition is `percentage < 60`, not <=/>= 60 - the object
   * keys "60"/"61" in professional_home_percentage_contents are unrelated to this cutoff, they're
   * just how the two entries happen to be named). Pass `clickThrough: true` to also click the CTA
   * and confirm which real route it lands on (the >=60 bucket's is a known, pre-existing 404 -
   * see PERCENTAGE_CONTENT's doc comment) - done at most once per bucket by the caller, not for
   * every percentage value in a table, since the destination is a property of the bucket, not of
   * the specific number.
   */
  async checkDynamicProfileContent(percentage, { clickThrough = false } = {}) {
    const bucket = percentage < 60 ? PERCENTAGE_CONTENT.below60 : PERCENTAGE_CONTENT.from60;
    await expect(this.profileSuggestionParagraph).toHaveText(bucket.text);
    const button = this.page.getByRole("button", { name: bucket.buttonName, exact: true });
    await expect(button).toBeVisible();

    if (!clickThrough) return;
    await button.click();
    await this.page.waitForURL(new RegExp(bucket.buttonPath.replace(/\//g, "\\/")));
    await this.page.goto("/professional/home");
    await reapplyChatbotGuard(this.page);
    await expect(this.pathwaysHeading).toBeVisible();
  }

  /**
   * Verifies render_jobs_carousel()'s branch for the given percentage/data combination - the
   * real conditions are `percentage <= 30` (stats cards) and, above that, `percentage >= 61 &&
   * ai_job_details.length` (Featured Jobs from ai_job_details) vs everything else (Latest Jobs
   * from applied_jobs, including >=61 with an EMPTY ai_job_details - a real fallback case, not a
   * bug). `stats`/`sourceJobTitle` are only meaningful for the branch that actually reads them.
   */
  async checkJobsCarouselBranch(percentage, { aiJobsLength = 0, stats, sourceJobTitle } = {}) {
    if (percentage <= 30) {
      await expect(this.jobsOpenNowHeading).toBeVisible();
      await expect(this.page.getByText("Professionals in Our Network")).toBeVisible();
      await expect(this.page.getByText("Trusted Employers Onboard")).toBeVisible();
      await expect(this.page.getByText("Partner Programs to Upskill")).toBeVisible();
      if (stats) {
        // All four are real headings in the DOM (h3 for total_jobs, h4 for the 3 stat cards) -
        // confirmed live against app/(routes)/professional/home/page.js's render_jobs_carousel().
        for (const value of [stats.total_jobs, stats.total_professionals, stats.total_employers, stats.total_learning_posts]) {
          await expect(this.page.getByRole("heading", { name: String(value), exact: true })).toBeVisible();
        }
      }
      return;
    }

    const showsFeatured = percentage >= 61 && aiJobsLength > 0;
    await expect(showsFeatured ? this.featuredJobsHeading : this.latestJobsHeading).toBeVisible();
    if (sourceJobTitle) await expect(this.page.getByText(sourceJobTitle, { exact: true })).toBeVisible();
  }
}

module.exports = { ProfessionalHomePage, PERCENTAGE_CONTENT };
