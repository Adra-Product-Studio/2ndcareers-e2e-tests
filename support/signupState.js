// @ts-check

/**
 * The one account this whole signup-flow suite creates and carries across its numbered files
 * (02-new-user-signup generates it, every later file reads it) - a plain module-level object
 * works the same way homeMockState/etc. do elsewhere in this suite: these files run serially in
 * one worker process (playwright.config.js: workers: 1), so requiring this same module from
 * multiple spec files really does share one object between them, no different from module-level
 * state within a single file.
 */
const state = {
  role: "professional",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  city: "",
  yearsOfExperience: null,
  aiSummary: "",
  aiGenerated: false,
  /** @type {number | null} */
  profilePercentage: null,
  /** @type {string | null} */
  createdOn: null,
  /** @type {string | null} */
  emailVerifiedOn: null,
};

module.exports = { state };
