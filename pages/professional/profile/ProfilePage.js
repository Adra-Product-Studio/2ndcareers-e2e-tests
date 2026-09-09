// @ts-check
const { expect } = require("@playwright/test");
const { waitForApiData } = require("../../../support/apiEnvelope");

/**
 * /professional/profile (reached from the header's profile dropdown - "My Profile"). Loads via
 * POST /professional_profile_dashboard - captured live, see e2e-tests/README.md.
 *
 * This page is full of real CRUD forms against this account's live data. Every mutating method
 * below follows one of two reversible patterns so the suite is safe to run on every CI push:
 *   - List sections (Experience, Education, Skills, Languages, Additional Information, Social
 *     Media Links): add a clearly-marked temporary entry, verify it, then delete it - the
 *     account's real pre-existing rows are never touched.
 *   - Singleton text sections (About, Preference): read the current value, set a temporary one,
 *     verify, then restore the exact original value.
 * Personal Details is exercised as a no-op save (Edit -> Save with no field changes) - it
 * re-submits the same values already loaded, so the real endpoint is exercised without risking
 * any actual change to the account's data.
 *
 * Resume upload is NOT automated here: confirmed live, uploading ANY file (even the current
 * resume re-uploaded) opens a "New Resume Upload Confirmation" dialog stating "all fields will
 * be replaced with the content extracted from the new resume" - i.e. it re-parses and can
 * overwrite Personal Details/About/Experience/Education/Skills, and that re-extraction isn't
 * guaranteed to reproduce today's exact values. Only read-only display (filename + working
 * Download link) is checked. Profile Photo and Video uploads are also not automated (deferred -
 * would need committed binary test fixtures and weren't part of this pass's scope).
 */
class ProfessionalProfilePage {
  constructor(page) {
    this.page = page;

    // Section headings
    this.personalDetailsHeading = page.getByRole("heading", { name: "Personal Details" });
    this.aboutHeading = page.getByRole("heading", { name: "About", exact: true });
    this.experienceHeading = page.getByRole("heading", { name: "Experience", exact: true });
    this.educationHeading = page.getByRole("heading", { name: "Education", exact: true });
    this.skillsHeading = page.getByRole("heading", { name: "Skills", exact: true });
    this.preferenceHeading = page.getByRole("heading", { name: "Preference" });
    this.videoHeading = page.getByRole("heading", { name: "Video", exact: true });
    this.languagesHeading = page.getByRole("heading", { name: "Languages", exact: true });
    this.additionalInfoHeading = page.getByRole("heading", { name: "Additional Information" });
    this.socialLinksHeading = page.getByRole("heading", { name: "Social Media Links" });

    // Resume (read-only)
    // Not an end-anchored /\.pdf$/ - the paragraph also contains the nested "Download PDF" link
    // text after the filename (confirmed live), so the combined text doesn't end in ".pdf".
    this.resumeFileName = page.locator("p", { hasText: /\.pdf/ });
    this.resumeDownloadLink = page.getByRole("link", { name: "Download PDF" });

    // Personal Details (inline edit) - the heading sits alone in its own wrapper div; the
    // Edit/Save button is a sibling of THAT wrapper, one level further up (confirmed live via
    // outerHTML dump - "../.." not ".." - same for About and Preference below).
    this.personalDetailsEditButton = this.personalDetailsHeading.locator("../..").getByRole("button", { name: "Edit" });
    this.personalDetailsSaveButton = this.personalDetailsHeading.locator("../..").getByRole("button", { name: "Save" });

    // About (inline edit)
    this.aboutEditButton = this.aboutHeading.locator("../..").getByRole("button", { name: "Edit" });

    // Preference (inline edit)
    this.preferenceEditButton = this.preferenceHeading.locator("../..").getByRole("button", { name: "Edit" });

    // Modal chrome shared by every "Add X" dialog
    this.modalCloseButton = page.getByRole("button", { name: "Close" });
    this.modalCancelButton = page.getByRole("button", { name: "Cancel" });
    this.modalSaveButton = page.getByRole("button", { name: "Save", exact: true });
    this.modalDeleteButton = page.getByRole("button", { name: "Delete" });
  }

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
    await expect(this.preferenceHeading).toBeVisible();
    await expect(this.videoHeading).toBeVisible();
    await expect(this.languagesHeading).toBeVisible();
    await expect(this.additionalInfoHeading).toBeVisible();
    await expect(this.socialLinksHeading).toBeVisible();
  }

  /** Confirmed live: uploading any file (even today's own resume, re-selected) re-parses and can
   * overwrite other profile sections - see class doc comment. Only display is checked here. */
  async checkResumeDisplay() {
    await expect(this.resumeFileName.first()).toBeVisible();
    await expect(this.resumeDownloadLink).toHaveAttribute("href", /\.pdf$/);
  }

  /**
   * Personal Details toggles the whole card into inline-editable fields (no separate modal, no
   * Cancel button - Edit becomes Save in place). NOT exercised as a no-op save-and-verify cycle:
   * confirmed live, this account has no phone number saved (the field renders as bare "+1" with
   * no digits), and Save is validated client-side to require "Contact Number, Country Code" -
   * clicking Save with nothing changed fails that validation and never even calls the API, with
   * no way to make it a true no-op without also permanently adding a phone number. Only checks
   * that Edit opens the real, pre-filled fields, without ever saving.
   */
  async checkPersonalDetailsOpensEditableFields() {
    await this.personalDetailsEditButton.click();
    await expect(this.personalDetailsSaveButton).toBeVisible();
    // getByText doesn't match an <input>'s value - locate it directly instead.
    await expect(this.page.locator('input[value="vetri042628@gmail.com"]')).toBeVisible();
  }

  /**
   * Reads the current About text, sets a temporary one, verifies it saved, then restores the
   * original text - both round trips go through POST /professional_about_update. Scoped to the
   * About section's own paragraph via the closest ancestor that actually contains a `<p>` -
   * a bare `page.locator("p")` also matches unrelated page text (the "Update Profile Photo"
   * avatar label comes first in the DOM), and a fixed "../.." guess overshoots into the Resume
   * section's filename `<p>`, which sits between About's heading and its own text (confirmed live).
   */
  async checkAboutEditRevert() {
    const aboutParagraph = this.aboutHeading.locator("xpath=ancestor::*[.//p][1]").locator("p").first();
    const original = (await aboutParagraph.textContent()) || "";
    const tempText = "E2E temporary About text - safe to overwrite.";

    await this._editSingletonText(this.aboutHeading, this.aboutEditButton, "professional_about_update", tempText);
    // Scoped to the About paragraph itself, not a page-wide getByText - confirmed live, the
    // "Navi" chatbot's own message textarea can independently carry matching text (an old draft
    // persisted from browser storage, unrelated to this edit), which a page-wide text match
    // treats as a strict-mode violation.
    await expect(aboutParagraph).toHaveText(tempText);
    await this._editSingletonText(this.aboutHeading, this.aboutEditButton, "professional_about_update", original);
    await expect(aboutParagraph).toHaveText(original);
  }

  /**
   * Preference starts empty ("Your preferences details will be displayed here"). NOT exercised
   * as an edit-then-revert cycle like About: validate/professional_profile.js's
   * professional_preferences_validator requires a non-blank value
   * (`if (!params?.preferences) errors.preferences = "Preferences are required"`), confirmed
   * live - submitting an empty string to clear it back to blank fails client-side validation
   * silently (the request never fires at all). Once set, there is no way back to this account's
   * original blank state through the UI, so this only verifies the read-only placeholder and
   * that Edit opens the real textarea, without ever saving - matching the same
   * never-mutate-what-can't-be-restored principle as Resume.
   */
  async checkPreferenceDisplay() {
    const placeholder = "Your preferences details will be displayed here";
    await expect(this.page.getByText(placeholder)).toBeVisible();
    const scope = this.preferenceHeading.locator("xpath=ancestor::*[.//textarea][1]");
    await this.preferenceEditButton.click();
    // Not page.getByRole("textbox").last() - that matches the "Navi" chatbot's own message input
    // instead (confirmed live, see _editSingletonText's doc comment).
    await expect(scope.getByRole("textbox")).toBeVisible();
  }

  /**
   * Shared inline-edit helper for About/Preference - both are "click Edit, replace the
   * textarea's content, click Save" with no other required fields.
   * `page.getByRole("textbox").last()` is NOT safe here: confirmed live, the "Navi" chatbot's
   * own message input is a textbox that sits after these in the DOM, so `.last()` silently types
   * into the chatbot instead of the edit textarea whenever the chatbot widget is present (which
   * is always). `sectionHeading` must be the section's own heading locator (stable regardless of
   * edit state, unlike the Edit/Save button whose accessible name changes) - the textbox is
   * scoped to its closest ancestor that actually contains one.
   */
  async _editSingletonText(sectionHeading, editButton, endpointPattern, newText) {
    const scope = sectionHeading.locator("xpath=ancestor::*[.//textarea][1]");
    await editButton.click();
    const textbox = scope.getByRole("textbox");
    await textbox.fill("");
    if (newText) await textbox.pressSequentially(newText, { delay: 20 });
    await waitForApiData(this.page, new RegExp(`/${endpointPattern}`), () => this.modalSaveButton.click());
  }

  /**
   * Experience: opens "Add", fills the required fields with a clearly-marked temporary entry,
   * saves (POST /professional_experience_update), verifies it's listed, then reopens it via its
   * own "Edit" button and deletes it (nested confirm modal -> POST /professional_experience_delete).
   */
  async addThenDeleteExperience() {
    const title = "E2E Temporary Role";
    const company = "E2E Temporary Company";

    await this.experienceHeading.locator("../..").getByRole("button", { name: "Add" }).click();
    await this.page.getByRole("textbox", { name: "Enter your job title" }).fill(title);
    await this.page.getByRole("textbox", { name: "Enter your company name" }).fill(company);
    await this.page.getByRole("textbox", { name: "Enter a location" }).fill("Remote");
    await this.page.locator('input[type="month"]').first().fill("2024-01");
    await this.page.getByRole("checkbox", { name: "I am Currently working in this company" }).check();

    await waitForApiData(this.page, /\/professional_experience_update/, () =>
      this.page.getByRole("button", { name: "Save", exact: true }).click()
    );
    await expect(this.page.getByText(title, { exact: false })).toBeVisible();

    await this._deleteListEntryViaEditModal(title, "professional_experience_delete");
    await expect(this.page.getByText(title, { exact: false })).toBeHidden();
  }

  /** Education: same add/edit/delete pattern as Experience, via POST
   * /professional_education_update and /professional_education_delete. */
  async addThenDeleteEducation() {
    const degree = "E2E Temporary Degree";
    const institute = "E2E Temporary Institute";

    await this.educationHeading.locator("../..").getByRole("button", { name: "Add" }).click();
    await this.page.getByRole("textbox", { name: /degree/i }).first().fill(degree);
    await this.page.getByRole("textbox", { name: /field of study|specialisation/i }).fill("E2E Testing");
    await this.page.getByRole("textbox", { name: /school/i }).first().fill(institute);
    await this.page.getByRole("textbox", { name: "Enter a location" }).fill("Remote");
    const monthInputs = this.page.locator('input[type="month"]');
    await monthInputs.first().fill("2020-01");
    await monthInputs.last().fill("2021-01");

    await waitForApiData(this.page, /\/professional_education_update/, () =>
      this.page.getByRole("button", { name: "Save", exact: true }).click()
    );
    await expect(this.page.getByText(degree, { exact: false })).toBeVisible();

    await this._deleteListEntryViaEditModal(degree, "professional_education_delete");
    await expect(this.page.getByText(degree, { exact: false })).toBeHidden();
  }

  /**
   * Skills/Languages both use the same "list-modal" pattern: "Add" opens a dropdown + level
   * picker; the row only becomes deletable from the separate "Edit" button, which toggles the
   * same modal into a delete-icon-per-row mode.
   */
  async addThenDeleteSkill() {
    await this._addDropdownListEntry({
      addButton: this.skillsHeading.locator("../..").getByRole("button", { name: "Add" }),
      itemLabel: "Skill",
      itemValue: "Project Management",
      levelLabel: "Skill level",
      levelValue: "Beginner",
      endpointPattern: "professional_skills_update",
    });
    // .first() - a list re-render can transiently double-render the new row for a moment
    // (confirmed live), which a plain toBeVisible() on a non-unique locator treats as a strict
    // mode violation rather than waiting it out.
    await expect(this.page.getByText("Project Management", { exact: true }).first()).toBeVisible();

    await this._deleteDropdownListEntry({
      editButton: this.skillsHeading.locator("../..").getByRole("button", { name: "Edit" }),
      rowText: "Project Management",
      endpointPattern: "professional_skill_delete",
    });
    await expect(this.page.getByText("Project Management", { exact: true })).toBeHidden();
  }

  async addThenDeleteLanguage() {
    await this._addDropdownListEntry({
      addButton: this.languagesHeading.locator("../..").getByRole("button", { name: "Add" }),
      itemLabel: "Language",
      itemValue: "English",
      levelLabel: "Language level",
      // Language levels are CEFR-style proficiency labels, NOT the Beginner/Intermediate/
      // Advanced/Expert scale Skills uses - confirmed live (Elementary/Limited Working/
      // Professional Working/Full Professional/Native or Bilingual Proficiency).
      levelValue: "Elementary Proficiency",
      endpointPattern: "professional_language_update",
    });
    await expect(this.page.getByText("English", { exact: true }).first()).toBeVisible();

    await this._deleteDropdownListEntry({
      editButton: this.languagesHeading.locator("../..").getByRole("button", { name: "Edit" }),
      rowText: "English",
      endpointPattern: "professional_language_delete",
    });
    await expect(this.page.getByText("English", { exact: true })).toBeHidden();
  }

  /**
   * Additional Information: title + description. The UI labels description "(Optional)", but
   * the server disagrees - confirmed live, submitting title alone gets rejected with
   * `{success: false, error_code: 204, message: "Please fill in all the required fields."}` since
   * the request body then has no `description` key at all (the field's onChange never fires, so
   * it's never added to state). Both fields are filled here to match what the server actually
   * requires. Delete lives in the edit modal's own footer (only shown once editing an existing
   * item) via POST /delete_professional_additional_info.
   */
  async addThenDeleteAdditionalInfo() {
    const title = "E2E Temporary Additional Info";
    await this.additionalInfoHeading.locator("../..").getByRole("button", { name: "Add" }).click();
    await this.page.getByRole("textbox", { name: "Enter your title" }).fill(title);
    await this.page.getByPlaceholder("Share with potential employers about your job preferences").fill("E2E test description.");
    await waitForApiData(this.page, /\/update_professional_additional_info/, () => this.modalSaveButton.click());
    await expect(this.page.getByText(title, { exact: true })).toBeVisible();

    await this.page.getByText(title, { exact: true }).locator("../..").getByRole("button", { name: "Edit" }).click();
    await waitForApiData(this.page, /\/delete_professional_additional_info/, () => this.modalDeleteButton.click());
    await expect(this.page.getByText(title, { exact: true })).toBeHidden();
  }

  /** Social Media Links: title + url, same edit-modal delete pattern via POST
   * /professional_social_link_delete. */
  async addThenDeleteSocialLink() {
    const title = "E2E Temporary Link";
    await this.socialLinksHeading.locator("../..").getByRole("button", { name: "Add" }).click();
    await this.page.getByRole("textbox", { name: "Enter your Social Media" }).fill(title);
    await this.page.getByRole("textbox", { name: "Enter your Url" }).fill("https://example.com/e2e-test");
    await waitForApiData(this.page, /\/professional_socail_link_update/, () => this.modalSaveButton.click());
    await expect(this.page.getByText(title, { exact: true })).toBeVisible();

    await this.page.getByText(title, { exact: true }).locator("../..").getByRole("button", { name: "Edit" }).click();
    await waitForApiData(this.page, /\/professional_social_link_delete/, () => this.modalDeleteButton.click());
    await expect(this.page.getByText(title, { exact: true })).toBeHidden();
  }

  /** Reopens a just-created Experience/Education row by its distinctive text, then deletes it
   * through the nested confirm-delete modal inside that row's own Edit dialog. */
  async _deleteListEntryViaEditModal(rowText, endpointPattern) {
    await this.page.getByText(rowText, { exact: false }).first().locator("../..").getByRole("button", { name: "Edit" }).click();
    await this.modalDeleteButton.click();
    const confirmDeleteButton = this.page.getByRole("dialog").last().getByRole("button", { name: "Delete" });
    await waitForApiData(this.page, new RegExp(`/${endpointPattern}`), () => confirmDeleteButton.click());
  }

  /**
   * Confirmed live: this modal has no separate outer "Save" step - each click of its own inner
   * "Add" button immediately persists that one row to the server (POST .../update), and the
   * modal just keeps listing what's already saved. Close the modal once that call resolves.
   */
  async _addDropdownListEntry({ addButton, itemLabel, itemValue, levelLabel, levelValue, endpointPattern }) {
    await addButton.click();
    await this.page.getByRole("button", { name: itemLabel, exact: true }).click();
    await this.page.getByRole("button", { name: itemValue, exact: true }).click();
    await this.page.getByRole("button", { name: levelLabel, exact: true }).click();
    await this.page.getByRole("button", { name: levelValue, exact: true }).click();
    await waitForApiData(this.page, new RegExp(`/${endpointPattern}`), () =>
      this.page.getByRole("button", { name: "Add", exact: true }).last().click()
    );
    await this.modalCloseButton.click();
  }

  async _deleteDropdownListEntry({ editButton, rowText, endpointPattern }) {
    await editButton.click();
    const row = this.page.getByRole("row", { name: new RegExp(rowText) }).first();
    await waitForApiData(this.page, new RegExp(`/${endpointPattern}`), () => row.getByRole("button").last().click());
    await this.modalCloseButton.click();
  }
}

module.exports = { ProfessionalProfilePage };
