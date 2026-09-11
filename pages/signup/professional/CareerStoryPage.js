// @ts-check
const { expect } = require("@playwright/test");

// validate/professional_signup.js's YourCareerStoryValidation.
const ERRORS = {
  experienceRequired: "Years of experience is required",
  industryRequired: "Please select at least one industry",
  sectorRequired: "Please select at least one sector",
  functionalRequired: "Please select at least one functional role",
};

/**
 * Step 3 - /role_selection/professional_signup/your_career_story. Resume upload is genuinely
 * OPTIONAL (confirmed live and in the real code: the validator's own file check is commented
 * out, the field has no is_mandatory, and its own placeholder literally says "(optional)") - this
 * suite completes the flow without one, matching the simplest real path a person can take.
 * Dropdowns are a bespoke component (json/Inputfunctions.js), not a native <select> -
 * page.selectOption() does not work here; open via the placeholder text, pick from
 * ".custom-dropdown-item".
 */
class CareerStoryPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Your Career Story", exact: true });
    this.yearsInput = page.getByPlaceholder(/Enter in years/);
    this.industryTrigger = page.getByText("Select your industry", { exact: true });
    this.sectorTrigger = page.getByText("Select your sector type", { exact: true });
    this.functionalTrigger = page.getByText(/key functional expertise/);
    this.dropdownOptions = page.locator(".custom-dropdown-item");
    this.resumeInput = page.locator("#file_upload");
    this.submitButton = page.getByRole("button", { name: "Submit Your Profile!", exact: true });
  }

  async checkPageChrome() {
    await expect(this.heading).toBeVisible();
    await expect(this.yearsInput).toBeVisible();
    await expect(this.industryTrigger).toBeVisible();
    await expect(this.sectorTrigger).toBeVisible();
    await expect(this.functionalTrigger).toBeVisible();
    // Confirmed live: the visible dropzone text literally says "(optional)".
    await expect(this.page.getByText("Upload PDF resume (optional)", { exact: true })).toBeVisible();
  }

  /** Opens `trigger`'s dropdown and clicks a random one of its real options (a closed,
   * backend-driven set - json/json_data/auth/index.js, not free text - so plain randomization
   * over the actually-rendered options is what varies this run to run, no AI needed for a fixed
   * list), then closes the menu by clicking a neutral point on the page (these are custom divs,
   * not native selects - clicking outside is how a person would dismiss the open menu). Returns
   * the picked option's label. */
  async _pickRandomOption(trigger) {
    await trigger.click();
    await expect(this.dropdownOptions.first()).toBeVisible();
    const count = await this.dropdownOptions.count();
    const option = this.dropdownOptions.nth(Math.floor(Math.random() * count));
    const label = (await option.textContent()) || "";
    await option.click();
    await this.yearsInput.click().catch(() => {});
    return label.trim();
  }

  async submitAndExpectValidationErrors(expectedErrors) {
    let requestFired = false;
    const onRequest = (req) => {
      if (/\/professional_register/.test(req.url())) requestFired = true;
    };
    this.page.on("request", onRequest);
    await this.submitButton.click();
    await this.page.waitForTimeout(500);
    this.page.off("request", onRequest);

    expect(requestFired, "expected no /professional_register request for an invalid submission").toBe(false);
    for (const message of expectedErrors) {
      await expect(this.page.getByText(message, { exact: true }).first()).toBeVisible();
    }
  }

  async checkEmptyFormShowsAllErrors() {
    await this.submitAndExpectValidationErrors([
      ERRORS.experienceRequired,
      ERRORS.industryRequired,
      ERRORS.sectorRequired,
      ERRORS.functionalRequired,
    ]);
  }

  /** Fills every required field (no resume) and submits - the real POST /professional_register
   * multipart request, confirmed live to succeed with error_code 0 and land on signup_success. */
  async submitValid(yearsOfExperience) {
    await this.yearsInput.fill(String(yearsOfExperience));
    const industry = await this._pickRandomOption(this.industryTrigger);
    const sector = await this._pickRandomOption(this.sectorTrigger);
    const functionalRole = await this._pickRandomOption(this.functionalTrigger);

    const [response] = await Promise.all([
      this.page.waitForResponse(/\/professional_register/, { timeout: 15_000 }),
      this.submitButton.click(),
    ]);
    const json = await response.json();
    expect(response.ok()).toBe(true);
    expect(json.error_code).toBe(0);
    // Same generic message step 1 also returns - confirmed live; About You (step 2) is the
    // one step with its own distinct message.
    expect(json.message).toBe("Your Professional Account details were added successfully");

    // See NewUserSignupPage.submitValid()'s doc comment - a route push resolving isn't the same
    // as the destination having actually rendered anything yet.
    await this.page.waitForURL(/\/signup_success/, { timeout: 10_000 });
    await expect(this.page.getByText("You’re almost there!", { exact: true })).toBeVisible({ timeout: 20_000 });
    return { json, industry, sector, functionalRole };
  }
}

module.exports = { CareerStoryPage, ERRORS };
