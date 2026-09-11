// @ts-check

/**
 * A brand new email address for one signup-flow run, at the real Mailinator private domain given
 * for this suite - not a mock inbox, an actual address that receives an actual verification
 * email. HHMMSS keeps it short and matches the naming convention already used for manual runs
 * against this same domain (see Mailinator's own private inbox history) - collisions are
 * possible if two runs start in the same second, but this suite never runs concurrently with
 * itself (playwright.config.js: workers: 1), so that's a non-issue in practice.
 */
function generateSignupEmail() {
  const domain = process.env.SIGNUP_TEST_EMAIL_DOMAIN || "";
  const now = new Date();
  const hhmmss = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join("");
  const localPart = `playwrightprof${hhmmss}`;
  return { localPart, email: domain ? `${localPart}@${domain}` : "" };
}

/** Reads the Mailinator account that owns SIGNUP_TEST_EMAIL_DOMAIN as a private domain - this is
 * the account used to log into mailinator.com itself and read the verification email, not the
 * throwaway signup address above. All optional, same pattern as fixtures/credentials.js - the
 * whole signup-flow suite skips (not fails) when any of these three are unset. */
function signupTestConfig() {
  const mailinatorUsername = process.env.MAILINATOR_USERNAME || "";
  const mailinatorPassword = process.env.MAILINATOR_PASSWORD || "";
  const domain = process.env.SIGNUP_TEST_EMAIL_DOMAIN || "";
  return {
    mailinatorUsername,
    mailinatorPassword,
    domain,
    hasConfig: Boolean(mailinatorUsername && mailinatorPassword && domain),
  };
}

module.exports = { generateSignupEmail, signupTestConfig };
