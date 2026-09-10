// @ts-check

/**
 * Intercepts `urlPattern`, lets the REAL request go through (route.fetch()), then hands the
 * real, already-valid JSON body to `transform` and serves back whatever it returns. Used to test
 * a page's conditional rendering against specific field values (e.g. profile_percentage buckets)
 * that this shared real account may never actually sit at - without hand-rolling a fake envelope
 * that risks missing some other field the page also reads. Only the field(s) `transform`
 * actually changes differ from a real response; everything else is exactly what the backend sent.
 * @param {import("@playwright/test").Page} page
 * @param {RegExp} urlPattern
 * @param {(json: any) => any} transform
 */
async function mockApiField(page, urlPattern, transform) {
  await page.route(urlPattern, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    await route.fulfill({ response, json: transform(json) });
  });
}

/** Stops intercepting `urlPattern` - call after each mocked scenario so later, unrelated
 * requests to the same endpoint (a different page/tab reusing it) see real data again. Only call
 * this once the mocked response has actually been received (e.g. via page.waitForResponse()),
 * not just after whatever action triggered it (like page.reload(), which resolves on the load
 * event and can well return before mockApiField's own route.fetch() has finished) - confirmed
 * live that unrouting while that fetch is still in flight lets Playwright auto-resolve the
 * now-orphaned route, so this handler's own later route.fulfill() throws "Route is already
 * handled!" the moment its real fetch does resolve. */
async function clearMock(page, urlPattern) {
  await page.unroute(urlPattern);
}

module.exports = { mockApiField, clearMock };
