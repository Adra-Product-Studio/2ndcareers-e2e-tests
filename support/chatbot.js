// @ts-check

/**
 * The "Navi" chatbot (app/_chatbot/page.js, present on every /professional/* page) auto-opens
 * itself in a maximized overlay via a ONE-SHOT 15-second timer armed right after login
 * (services/auth/index.js) - cleared once the user's Home page finishes loading
 * (services/professional/index.js). On a fast run that race is a non-issue; on a cold local dev
 * server still compiling /professional/home for the first time (see the 45s allowance in
 * 01-login.spec.js), the 15s timer can win and pop the chatbot open mid-suite instead - confirmed
 * live: its body then has `pointer-events` covering the page, blocking a later click on anything
 * underneath it (a Filter button, in one observed failure) until Playwright's own retry budget
 * runs out. It never fires more than once per session (no repeating timer, no localStorage), so
 * checking before a click just costs one cheap, near-instant `isVisible()` the rest of the time.
 */
async function dismissChatbotIfOpen(page) {
  // Scoped to .chatbot_header - the footer's send button reuses the same chatbot_close_btn
  // class (confirmed live), so an unscoped locator would be ambiguous whenever the chatbot is open.
  const closeButton = page.locator(".chatbot_container.open .chatbot_header .chatbot_close_btn");
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  }
}

module.exports = { dismissChatbotIfOpen };
