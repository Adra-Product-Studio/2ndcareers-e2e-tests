// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../support/apiEnvelope");

/**
 * /professional/profile (reached from the header's profile dropdown - "My Profile"). Loads via
 * POST /professional_profile_dashboard - captured live, see e2e-tests/README.md. The page is
 * full of "Edit"/"Add" buttons that open real edit forms for this account's live data - this
 * Page Object deliberately only reads the page, it never opens/submits an edit, so the suite
 * can't accidentally mutate the test account's profile.
 */
class ProfessionalProfilePage {
  constructor(page) {
    this.page = page;
    this.personalDetailsHeading = page.getByRole("heading", { name: "Personal Details" });
    this.aboutHeading = page.getByRole("heading", { name: "About", exact: true });
    this.experienceHeading = page.getByRole("heading", { name: "Experience", exact: true });
    this.educationHeading = page.getByRole("heading", { name: "Education", exact: true });
    this.skillsHeading = page.getByRole("heading", { name: "Skills", exact: true });
  }

  /** Pass `action` (e.g. clicking "My Profile" in the header's profile dropdown) to trigger
   * the navigation that loads this page instead of a fresh page.goto(). */
  async waitForLoad(action = () => this.page.goto("/professional/profile")) {
    const data = await waitForApiData(this.page, /\/professional_profile_dashboard/, action);

    expect(data).toHaveProperty("email_id");
    expect(data.email_id).toContain("@");
    expect(data).toHaveProperty("first_name");
    expect(typeof data.profile_percentage).toBe("number");
    expect(Array.isArray(data.experience)).toBe(true);
    expect(Array.isArray(data.education)).toBe(true);
    expect(Array.isArray(data.skills)).toBe(true);

    return data;
  }

  async checkSections() {
    await expect(this.personalDetailsHeading).toBeVisible();
    await expect(this.aboutHeading).toBeVisible();
    await expect(this.experienceHeading).toBeVisible();
    await expect(this.educationHeading).toBeVisible();
    await expect(this.skillsHeading).toBeVisible();
  }
}

module.exports = { ProfessionalProfilePage };
