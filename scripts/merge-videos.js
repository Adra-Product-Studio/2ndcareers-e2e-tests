// @ts-check
// The whole numbered suite now shares ONE continuous browser context/page/video (see
// support/sharedPage.js) instead of one .webm per spec file, so there's normally exactly one
// recording to publish. This still tolerates more than one file turning up in that directory
// (e.g. a locally re-run single spec during authoring) by picking the most recently modified one,
// rather than concatenating - concatenating unrelated recordings from separate ad-hoc runs would
// itself produce the kind of jump-cut "refresh" this whole restructure was meant to remove.
const fs = require("fs");
const path = require("path");

const VIDEO_DIR = path.join(__dirname, "..", "test-results", "videos", "professional-suite");
const OUTPUT_PATH = path.resolve(process.cwd(), process.argv[2] || "e2e-automation.webm");

function main() {
  if (!fs.existsSync(VIDEO_DIR)) {
    console.error(`No video found at ${VIDEO_DIR} - run the suite (with video recording) first.`);
    process.exit(1);
  }

  const webms = fs
    .readdirSync(VIDEO_DIR)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => path.join(VIDEO_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (webms.length === 0) {
    console.error(`No .webm files found under ${VIDEO_DIR}.`);
    process.exit(1);
  }

  fs.copyFileSync(webms[0], OUTPUT_PATH);
  console.log(`Wrote ${OUTPUT_PATH} (from ${webms[0]}${webms.length > 1 ? `; ignored ${webms.length - 1} older recording(s) in the same directory` : ""})`);
}

main();
