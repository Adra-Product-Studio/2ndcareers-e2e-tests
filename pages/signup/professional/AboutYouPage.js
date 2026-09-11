// @ts-check
const { expect } = require("@playwright/test");

// validate/professional_signup.js's AboutYouValidation - see NewUserSignupPage.js's ERRORS
// comment for why these are copied as literal fixture text rather than imported.
const ERRORS = {
  firstNameRequired: "First Name is required",
  lastNameRequired: "Last Name is required",
  locationRequired: "Please choose a city from the dropdown list",
  phoneRequired: "Phone number is required",
};

/**
 * Step 2 - /role_selection/professional_signup/about_you. Only reachable with
 * completed_upto containing "new_user_signup" (enforced by the real page's own guard - a direct
 * page.goto() here with no prior step done in this session renders nothing at all), so this is
 * only ever driven by NewUserSignupPage's own real submit redirecting here.
 */
class AboutYouPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "About you", exact: true });
    this.firstNameInput = page.getByPlaceholder("Enter your First Name");
    this.lastNameInput = page.getByPlaceholder("Enter your Last Name");
    // Google Places Autocomplete (react-google-autocomplete) - typing alone never satisfies
    // validation, only picking a real ".pac-item" suggestion does (confirmed live: onBlur sets
    // errors.location unless city_from_dropdown was set by an actual dropdown pick).
    this.cityInput = page.getByPlaceholder(/This helps us connect you with local opportunities/);
    this.placesSuggestions = page.locator(".pac-item");
    // react-phone-input-2 - a real typing target, not a plain <input> you can .fill() blindly
    // (confirmed live: .fill() desyncs the library's own state and it snaps back to just the
    // country-code prefix, e.g. "+91", dropping every digit typed that way).
    this.phoneInput = page.locator(".professional_phone_input").first();
    this.submitButton = page.getByRole("button", { name: /Let.s move to Your Career Story/ });
  }

  async checkPageChrome() {
    await expect(this.heading).toBeVisible();
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.cityInput).toBeVisible();
    await expect(this.phoneInput).toBeVisible();
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
      ERRORS.firstNameRequired,
      ERRORS.lastNameRequired,
      ERRORS.locationRequired,
      ERRORS.phoneRequired,
    ]);
  }

  /** Typing a city WITHOUT picking a real autocomplete suggestion is a real, confirmed-live
   * rejection - the location error re-appears on blur specifically because no dropdown pick ever
   * happened, not because the text field itself is empty. */
  async checkCityWithoutPickingSuggestionIsRejected() {
    await this.cityInput.fill("New York");
    await this.cityInput.blur();
    await expect(this.page.getByText(ERRORS.locationRequired, { exact: true })).toBeVisible();
  }

  /** Types a real city and picks the first live Google Places suggestion - the only way this
   * field's own validation actually passes. */
  async pickCity(query) {
    await this.cityInput.fill(query);
    await expect(this.placesSuggestions.first()).toBeVisible({ timeout: 10_000 });
    const pickedLabel = (await this.placesSuggestions.first().textContent()) || "";
    await this.placesSuggestions.first().click();
    return pickedLabel.trim();
  }

  /** Real keystrokes, not .fill() - see phoneInput's own doc comment above. */
  async fillPhone(digits) {
    await this.phoneInput.click();
    await this.phoneInput.press("End");
    await this.phoneInput.pressSequentially(digits, { delay: 30 });
  }

  async submitValid({ firstName, lastName, city, phoneDigits }) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.pickCity(city);
    await this.fillPhone(phoneDigits);

    const [response] = await Promise.all([
      this.page.waitForResponse(/\/professional_register/, { timeout: 15_000 }),
      this.submitButton.click(),
    ]);
    const json = await response.json();
    expect(response.ok()).toBe(true);
    expect(json.error_code).toBe(0);
    // The one step with its own distinct message - steps 1 and 3 share
    // "Your Professional Account details were added successfully" instead, confirmed live.
    expect(json.message).toBe("Professional Account created successfully");

    // See NewUserSignupPage.submitValid()'s doc comment - a route push resolving isn't the same
    // as the destination having actually rendered anything yet.
    await this.page.waitForURL(/\/your_career_story/, { timeout: 10_000 });
    await expect(this.page.getByRole("heading", { name: "Your Career Story", exact: true })).toBeVisible({ timeout: 20_000 });
    return json;
  }
}

module.exports = { AboutYouPage, ERRORS };
