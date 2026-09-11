// @ts-check
const { expect } = require("@playwright/test");

/**
 * A real, live Mailinator private-domain inbox (mailinator.com), not a mock - this suite's whole
 * point in using it is verifying the REAL email 2nd Careers sends and the REAL backend
 * verification link it contains, the same way an actual new user would. Confirmed live end to
 * end: log in -> filter the Private Team Inbox to this signup's own local-part -> open the
 * "Email Verification" message -> its own "LINKS" tab lists the real backend URL directly, no
 * HTML-parsing needed.
 */
class MailinatorPage {
  constructor(page) {
    this.page = page;
    this.emailField = page.getByRole("textbox", { name: "Email field" });
    this.passwordField = page.getByRole("textbox", { name: "Password field" });
    this.loginControl = page.getByText("Log in", { exact: true });
    this.linksTab = page.getByRole("tab", { name: "LINKS" });
    // The LINKS tabpanel's own content (a table of real <a href> links found in the message)
    // renders asynchronously after the tab click resolves - confirmed live via the accessibility
    // tree: a real `link` role with the exact backend URL as its href, inside
    // `tabpanel "LINKS"`. Waiting on this locator directly (rather than grabbing
    // document.body.innerText right after the click) is what actually survives that render
    // delay, instead of catching whatever was on screen a moment before it painted.
    this.verificationLink = page.getByRole("tabpanel", { name: "LINKS" }).getByRole("link", { name: /email_verification/ });
  }

  async login(username, password) {
    await this.page.goto("https://www.mailinator.com/v4/login.jsp");
    await this.emailField.fill(username);
    await this.passwordField.fill(password);
    await this.loginControl.click();
    await this.page.waitForURL(/\/v4\/private\/inboxes\.jsp/, { timeout: 20_000 });
  }

  /**
   * Filters the Private Team Inbox to one signup's own local-part (everything before the @ -
   * the "To" column only ever shows that, never the full address) via the same `?to=` query
   * param the inbox's own search box uses, confirmed live. Waits for an "Email Verification" row
   * to appear (delivery isn't instant), then opens it and reads the real backend link straight
   * off the message's own "LINKS" tab - confirmed live this lists the destination URL directly,
   * no need to parse the HTML body.
   */
  async getVerificationLink(localPart, { timeoutMs = 150_000 } = {}) {
    const emailRow = this.page.getByRole("cell", { name: "Email Verification", exact: true });
    await this.page.goto(`https://www.mailinator.com/v4/private/inboxes.jsp?to=${encodeURIComponent(localPart)}`);

    // A real reload IS still required - confirmed live, the hard way: this inbox list does NOT
    // live-refresh its own rows for genuinely new mail while just sitting open (the "Received"
    // column ticking forward on an already-arrived row earlier was only client-side relative-time
    // math on data already loaded, not evidence of a background poll - a real fresh account's
    // still-in-transit email was never picked up without an explicit reload, no matter how long
    // a single un-refreshed wait sat there). What actually caused the "looping" look was the
    // reload CADENCE, not reloading itself - reloading every ~2-3s produced dozens of visible
    // full-page flashes over a run; reloading every ~15s cuts that to about ten for the same
    // total budget, while still reliably catching delivery.
    //
    // The budget itself also had to grow, separately from the cadence fix: confirmed live,
    // repeatedly - this real mail service has genuinely taken close to (and sometimes past) 90-105s
    // to actually deliver the email, not merely to have it rendered here. A manual check right
    // after one such "failure" showed the row already sitting there, timestamped a few minutes
    // earlier - the send itself is just slow sometimes, not something a smarter search/click
    // sequence can route around.
    const deadline = Date.now() + timeoutMs;
    let found = await emailRow.first().isVisible({ timeout: 5_000 }).catch(() => false);
    while (!found && Date.now() < deadline) {
      await this.page.waitForTimeout(15_000);
      await this.page.reload();
      found = await emailRow.first().isVisible({ timeout: 5_000 }).catch(() => false);
    }
    if (!found) {
      // One last, patient look before giving up - confirmed live (twice, in earlier runs): a
      // failure screenshot the instant after this exact assertion failed has shown the row
      // already present, arrived a hair after the last poll's own short isVisible() window ran
      // out.
      found = await emailRow.first().isVisible({ timeout: 15_000 }).catch(() => false);
    }
    expect(found, `no "Email Verification" message arrived for ${localPart} within ${timeoutMs}ms`).toBe(true);

    await emailRow.first().click();
    await this.linksTab.click();
    await expect(this.verificationLink).toBeVisible({ timeout: 15_000 });
    const href = await this.verificationLink.getAttribute("href");
    expect(href, "no email_verification link found in the LINKS tab").toBeTruthy();
    return /** @type {string} */ (href);
  }
}

module.exports = { MailinatorPage };
