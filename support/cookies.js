// @ts-check

const PROJECT_LOG_COOKIE = "two_nd_project_log";

/**
 * project_log (cookie `two_nd_project_log`) carries the per-role flags that drive the first-time
 * user experience - show_profile_overlay, show_home_joy_ride, show_profile_joy_ride (see
 * store/project_log_store.js, app/api/logs/project_log/route.js). It's httpOnly (invisible to
 * page JS, confirmed live) and AES-encrypted - readable/settable through Playwright's own
 * context-level cookie jar regardless, since that operates over CDP, not document.cookie.
 *
 * These helpers deliberately never decrypt it. Capturing the raw encrypted value before a test
 * touches it, then restoring that EXACT value afterward via restoreProjectLogCookie(), round-trips
 * this real shared account back to its real prior state byte-for-byte - no need to know or
 * reconstruct what was actually in it, and no dependency on NEXT_PUBLIC_URL_CRYPTO_SECRET_KEY
 * (a real secret this public e2e-tests repo has no business holding a copy of).
 */
async function captureProjectLogCookie(context) {
  const cookies = await context.cookies();
  return cookies.find((c) => c.name === PROJECT_LOG_COOKIE) || null;
}

/** Restores a cookie object previously returned by captureProjectLogCookie() - a no-op (rather
 * than an error) if the account had no project_log cookie set at all beforehand. */
async function restoreProjectLogCookie(context, captured) {
  if (captured) await context.addCookies([captured]);
}

module.exports = { PROJECT_LOG_COOKIE, captureProjectLogCookie, restoreProjectLogCookie };
