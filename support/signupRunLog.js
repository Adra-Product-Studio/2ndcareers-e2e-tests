// @ts-check
const fs = require("fs");
const path = require("path");

// A transient handoff file, not the durable log itself - test-results/ gets wiped before every
// run (see scripts/run-tracked-regression.js), so this is only ever read by that same script
// right after the signup-flow process that wrote it exits, before the next run's wipe happens.
const HANDOFF_PATH = path.join(__dirname, "..", "test-results", ".signup-run-handoff.json");

/** Called from the last signup-flow spec file's afterAll - dumps whatever signupState.js knows
 * at that point so a separate later process (the orchestration script, which runs in its own
 * Node process after this one exits) can read it back. */
function writeHandoffState(state) {
  fs.mkdirSync(path.dirname(HANDOFF_PATH), { recursive: true });
  fs.writeFileSync(HANDOFF_PATH, JSON.stringify(state, null, 2));
}

/** Reads back whatever the signup-flow run last wrote, or null if it never got that far (e.g. an
 * early step failed before file 05's afterAll ran). */
function readHandoffState() {
  try {
    return JSON.parse(fs.readFileSync(HANDOFF_PATH, "utf-8"));
  } catch {
    return null;
  }
}

module.exports = { writeHandoffState, readHandoffState, HANDOFF_PATH };
