// @ts-check
const { expect } = require("@playwright/test");

// json/json_data/professional/index.js's home_joy_ride_steps titles, in order - copied as literal
// fixture data (same approach as HomePage.js's PERCENTAGE_CONTENT) rather than importing the real
// json/ file, which sits outside this suite's read-only exception for store/services.
const STEP_TITLES = [
  "Welcome to 2nd Careers!",
  "Manage your personal information",
  "Continue your lifelong learning journey",
  "Connect with other professionals",
  "Explore available job opportunities",
];

/**
 * The Home page's first-time-user tour (components/joy_ride/index.js), a thin wrapper around the
 * @sjmc11/tourguidejs library - rendered as plain `.tg-dialog`/`.tg-backdrop` elements (not part
 * of the app's own component tree, no accessible role/name of its own to hook into). Configured
 * with `closeButton: false`, `exitOnEscape: false`, `exitOnClickOutside: false` - confirmed live,
 * the only way out is clicking through every one of its 5 steps (STEP_TITLES above) to the end,
 * which fires the library's own onAfterExit callback -> close_joy_ride() in
 * app/(routes)/professional/home/page.js, clearing the project_log cookie's show_home_joy_ride
 * flag (and, separately, arming the Navi chatbot's own 1s-delayed re-open - covered by this
 * suite's chatbot-neutralizing style, see support/chatbotGuard.js).
 */
class ProfessionalHomeJoyRide {
  constructor(page) {
    this.page = page;
    this.dialog = page.locator(".tg-dialog");
    this.title = page.locator(".tg-dialog-title");
    // Both the Back and Next/Finish buttons are real <button>s sharing the SAME class
    // (.tg-dialog-btn, confirmed live - there is no separate "next" class the way the library's
    // own bundled source strings suggested) - matched by their own real, distinct text instead.
    // The label itself changes from "Next" to "Finish" on the last step (also confirmed live).
    this.nextButton = page.getByRole("button", { name: "Next", exact: true });
    this.finishButton = page.getByRole("button", { name: "Finish", exact: true });
  }

  /** All 5 steps target header elements that exist on the page regardless of scroll position -
   * confirmed live against home_joy_ride_steps (body, then 4 header nav IDs) - so no scrolling is
   * needed between steps the way some other lazy-mounted content in this suite requires. */
  async waitForFirstStep() {
    await expect(this.dialog).toBeVisible({ timeout: 10_000 });
    await expect(this.title).toHaveText(STEP_TITLES[0]);
  }

  /**
   * Clicks "Next" through every step but the last, confirming each one's own title actually
   * appears before advancing. Confirmed live (reproduced directly, outside any test) that this
   * library's own step transition is a genuine, occasional race: the SAME click, at the SAME
   * point in the flow, sometimes advances the dialog immediately and sometimes leaves it showing
   * the step it was already on - not a timing issue this suite's own code controls (reactStrictMode
   * is off; nothing here double-invokes anything), and not something fixable from outside the
   * library. Clicking again when the title hasn't moved is what a person would naturally do if a
   * click on a real page didn't seem to register, so a bounded retry here is the correct-shaped
   * fix, not a workaround for a bug in this suite's own code.
   */
  async completeAll() {
    for (const title of STEP_TITLES.slice(1)) {
      await this._clickUntil(this.nextButton, () =>
        this.page.evaluate(() => document.querySelector(".tg-dialog-title")?.textContent).then((text) => text === title)
      );
    }
    await this._clickUntil(this.finishButton, () =>
      this.page.evaluate(() => document.querySelector(".tg-dialog") === null)
    );
    await expect(this.dialog).toBeHidden();
  }

  /**
   * Clicks `button`, then polls `isDone` (a fresh, direct DOM check each time via page.evaluate -
   * not a Locator method, which auto-waits for the element to be attached and would itself hang
   * across the very transition being polled for) - retrying the CLICK itself, not just the wait,
   * since what's occasionally lost is the step-advance triggered by the click, not just a
   * slow-to-render title.
   */
  async _clickUntil(button, isDone) {
    for (let attempt = 1; attempt <= 4; attempt++) {
      await button.click();
      const deadline = Date.now() + 3_000;
      while (Date.now() < deadline) {
        if (await isDone()) return;
        await this.page.waitForTimeout(100);
      }
      if (attempt === 4) throw new Error("JoyRide did not advance after 4 clicks on the same step");
    }
  }
}

module.exports = { ProfessionalHomeJoyRide };
