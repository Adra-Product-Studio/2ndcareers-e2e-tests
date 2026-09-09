// @ts-check
const { expect } = require("@playwright/test");

// Most endpoints use error_code 0 for success; get_training_data (Learning page) uses 200
// instead - both were observed live, so both count as success rather than picking one.
const SUCCESS_ERROR_CODES = [0, 200];

/**
 * Every 2nd Careers API response shares this envelope - verified live against /login,
 * /user_dashboard_details, /professional_updated_home, /professional_notifications,
 * /professional_dashboard, /get_training_data, and /professional_discourse_community:
 *   { data: <object|array>, error_code: 0 | 200, message: "<string>", success: true }
 * Returns `data` so callers can assert on the endpoint-specific shape.
 */
function expectSuccessEnvelope(body) {
  expect(body).toHaveProperty("success", true);
  expect(SUCCESS_ERROR_CODES).toContain(body.error_code);
  expect(typeof body.message).toBe("string");
  expect(body.message.length).toBeGreaterThan(0);
  expect(body).toHaveProperty("data");
  return body.data;
}

/**
 * The failure shape - verified live against /login with wrong credentials:
 *   { data: {}, error_code: 401, message: "<string>", success: false }
 */
function expectFailureEnvelope(body) {
  expect(body).toHaveProperty("success", false);
  expect(typeof body.error_code).toBe("number");
  expect(body.error_code).not.toBe(0);
  expect(typeof body.message).toBe("string");
  expect(body.message.length).toBeGreaterThan(0);
  return body;
}

/**
 * Reads response bodies for every URL matching `urlPatterns` as soon as each response fires,
 * instead of awaiting Promise.all() first and calling response.json() afterwards - a client-side
 * redirect that happens between those two steps can tear down the page's network buffer first,
 * failing the read with "Response body is not available for a response that was navigated away
 * from" (observed live). Reading inside the listener avoids that race entirely.
 */
function captureResponses(page, urlPatterns) {
  const bodies = new Map(urlPatterns.map((pattern) => [pattern, null]));
  const handler = (response) => {
    for (const pattern of urlPatterns) {
      if (bodies.get(pattern) === null && pattern.test(response.url())) {
        // Fire-and-forget: read immediately, before anything else can invalidate the buffer.
        bodies.set(
          pattern,
          response
            .json()
            .catch(() => undefined)
        );
      }
    }
  };
  page.on("response", handler);
  return {
    bodies,
    async collect() {
      await expect
        .poll(() => [...bodies.values()].every((v) => v !== null), {
          timeout: 30000,
          message: `Timed out waiting for response(s) matching: ${urlPatterns.join(", ")}`,
        })
        .toBe(true);
      page.off("response", handler);
      return Promise.all(urlPatterns.map((pattern) => bodies.get(pattern)));
    },
  };
}

/**
 * Registers the response listener BEFORE running `action` (usually a goto/click) so the
 * request it triggers can't race past us, then validates the envelope and returns `data`.
 */
async function waitForApiData(page, urlPattern, action) {
  const capture = captureResponses(page, [urlPattern]);
  if (action) await action();
  const [body] = await capture.collect();
  expect(body, `no valid JSON body captured for ${urlPattern}`).toBeTruthy();
  return expectSuccessEnvelope(body);
}

/** Like waitForApiData, but for a call that's expected to fail (e.g. bad login credentials). */
async function waitForFailedApiData(page, urlPattern, action) {
  const capture = captureResponses(page, [urlPattern]);
  if (action) await action();
  const [body] = await capture.collect();
  expect(body, `no valid JSON body captured for ${urlPattern}`).toBeTruthy();
  return expectFailureEnvelope(body);
}

/** Same as waitForApiData but for a single action that fans out into several calls. */
async function waitForApiDataMulti(page, urlPatterns, action) {
  const capture = captureResponses(page, urlPatterns);
  if (action) await action();
  const bodies = await capture.collect();
  return bodies.map((body, i) => {
    expect(body, `no valid JSON body captured for ${urlPatterns[i]}`).toBeTruthy();
    return expectSuccessEnvelope(body);
  });
}

module.exports = {
  expectSuccessEnvelope,
  expectFailureEnvelope,
  waitForApiData,
  waitForFailedApiData,
  waitForApiDataMulti,
};
