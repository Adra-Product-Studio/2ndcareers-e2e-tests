// @ts-check
// Merges the per-file .webm recordings (one per spec file - see support/sharedPage.js) into a
// single video covering the whole run, in file order (01-login, 02-home, ... 09-logout). Uses
// ffmpeg-static (a bundled binary) rather than relying on the machine/CI runner already having
// ffmpeg installed, so this works the same locally and in CI.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const VIDEOS_DIR = path.join(__dirname, "..", "test-results", "videos");
const OUTPUT_PATH = path.resolve(process.cwd(), process.argv[2] || "e2e-automation.webm");

function main() {
  if (!fs.existsSync(VIDEOS_DIR)) {
    console.error(`No videos found at ${VIDEOS_DIR} - run the suite (with video recording) first.`);
    process.exit(1);
  }

  // Each subdirectory is one spec file's videoName (see support/sharedPage.js) - sorting them
  // gives 01-login, 02-home, ... 09-logout, i.e. the right playback order.
  const dirs = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const files = [];
  for (const dir of dirs) {
    const dirPath = path.join(VIDEOS_DIR, dir);
    const webm = fs.readdirSync(dirPath).find((f) => f.endsWith(".webm"));
    if (webm) files.push(path.join(dirPath, webm));
  }

  if (files.length === 0) {
    console.error("No .webm files found under test-results/videos to merge.");
    process.exit(1);
  }

  const listPath = path.join(VIDEOS_DIR, "concat-list.txt");
  const listContent = files.map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n");
  fs.writeFileSync(listPath, listContent);

  execFileSync(
    ffmpegPath,
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", OUTPUT_PATH],
    { stdio: "inherit" }
  );

  console.log(`Wrote ${OUTPUT_PATH} (merged ${files.length} recordings: ${dirs.join(", ")})`);
}

main();
