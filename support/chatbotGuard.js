// @ts-check

const CHATBOT_NEUTRALIZING_CSS =
  ".chatbot_container.open, .chatbot_container.open * { pointer-events: none !important; }";

/**
 * See tests/professional/01-login/01-login.spec.js's doc comment for the full story on WHY this
 * exists (the Navi chatbot's one-shot post-login auto-open can win a race on a real backend and
 * then block clicks across the whole viewport for the rest of the session). That first injection
 * only covers client-side nav-link transitions from then on - confirmed live, a page.reload() or
 * page.goto() is a fresh document, and neither carries over a previously injected <style> tag the
 * way it carries over normal page state. Any test code that deliberately reloads/re-navigates
 * (mocking a fresh API response, returning from a click-through) needs to call this again
 * afterward, or every click for the rest of the suite is back to racing that timer unprotected.
 */
async function reapplyChatbotGuard(page) {
  await page.addStyleTag({ content: CHATBOT_NEUTRALIZING_CSS });
}

module.exports = { CHATBOT_NEUTRALIZING_CSS, reapplyChatbotGuard };
