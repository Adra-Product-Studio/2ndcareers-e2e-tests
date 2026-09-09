// @ts-check

const ROLES = ["professional", "employer", "partner", "superadmin"];

const DEFAULT_REDIRECT_PATHS = {
  professional: "/professional/home",
  employer: "/employer/home",
  partner: "/partner/home",
  // Real superadmin login on a non-local build redirects off-app to a separate Amplify
  // admin console (see services/auth/index.js in the main repo) - the superadmin spec
  // handles that case separately instead of using this path.
  superadmin: "/super_admin/professional/home",
};

/**
 * Reads one role's test account from env vars. All values are optional - a role with no
 * credentials set still runs the page-load/validation/invalid-credential steps, it just
 * skips the "logs in successfully" step instead of failing the run.
 */
function credentialsFor(role) {
  const prefix = role.toUpperCase();
  const email = process.env[`${prefix}_TEST_EMAIL`] || "";
  const password = process.env[`${prefix}_TEST_PASSWORD`] || "";
  const redirectPath = process.env[`${prefix}_TEST_REDIRECT_PATH`] || DEFAULT_REDIRECT_PATHS[role];

  return { email, password, redirectPath, hasCredentials: Boolean(email && password) };
}

module.exports = { ROLES, DEFAULT_REDIRECT_PATHS, credentialsFor };
