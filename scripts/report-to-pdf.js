// @ts-check
// Renders the just-generated Playwright HTML report to a PDF using Playwright's own
// Chromium (already installed for the test run) instead of adding a PDF dependency.
const path = require("path");
const { chromium } = require("@playwright/test");

async function main() {
  const reportIndex = path.resolve(__dirname, "..", "playwright-report", "index.html");
  const outputPath = path.resolve(process.cwd(), process.argv[2] || "playwright-report.pdf");

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${reportIndex}`);
  await page.waitForSelector("text=/passed|failed|skipped/i", { timeout: 15000 }).catch(() => {});
  await page.pdf({ path: outputPath, format: "A4", printBackground: true });
  await browser.close();

  console.log(`Wrote ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
