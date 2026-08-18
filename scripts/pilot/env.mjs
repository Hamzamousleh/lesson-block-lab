import fs from "node:fs";
import path from "node:path";

export const REQUIRED_CONFIRMATION = "yes-dedicated-test-project";

export function parseEnv(text = "") {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function projectRefFromUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    const match = hostname.match(/^([a-z0-9-]+)\.supabase\.(?:co|in)$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function assertIsolatedTestEnvironment(values, knownProductionRefs = []) {
  const required = [
    "TEST_SUPABASE_URL",
    "TEST_SUPABASE_PROJECT_REF",
    "TEST_SUPABASE_ANON_KEY",
    "TEST_SUPABASE_SERVICE_ROLE_KEY",
    "TEST_TEACHER_A_EMAIL",
    "TEST_TEACHER_A_PASSWORD",
    "TEST_TEACHER_B_EMAIL",
    "TEST_TEACHER_B_PASSWORD",
    "PRODUCTION_SUPABASE_PROJECT_REF",
  ];
  if (values.TEST_ENV !== "true") throw new Error("ABORT: TEST_ENV must be exactly true.");
  if (values.TEST_ALLOW_DESTRUCTIVE_FIXTURES !== REQUIRED_CONFIRMATION) {
    throw new Error("ABORT: dedicated test-project confirmation is missing.");
  }
  for (const key of required) {
    if (!values[key]) throw new Error(`ABORT: ${key} is required.`);
  }

  const urlRef = projectRefFromUrl(values.TEST_SUPABASE_URL);
  if (!urlRef || urlRef !== values.TEST_SUPABASE_PROJECT_REF) {
    throw new Error("ABORT: test URL and TEST_SUPABASE_PROJECT_REF do not match.");
  }

  const forbidden = new Set([
    values.PRODUCTION_SUPABASE_PROJECT_REF,
    ...knownProductionRefs.filter(Boolean),
  ]);
  if (forbidden.has(urlRef))
    throw new Error("ABORT: integration tests point at a production/app Supabase project.");
  if (values.TEST_TEACHER_A_EMAIL === values.TEST_TEACHER_B_EMAIL) {
    throw new Error("ABORT: the two test tenants must use different users.");
  }
  if (
    !values.TEST_TEACHER_A_EMAIL.includes("test") ||
    !values.TEST_TEACHER_B_EMAIL.includes("test")
  ) {
    throw new Error("ABORT: test teacher emails must be explicitly test-namespaced.");
  }
  if (values.VITE_SUPABASE_SERVICE_ROLE_KEY || values.TEST_VITE_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("ABORT: service-role credentials must never use a VITE_ prefix.");
  }
  return { ...values, testProjectRef: urlRef };
}

function readEnvFile(file) {
  return fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {};
}

export function loadPilotEnvironment(root = process.cwd()) {
  const testFile = path.join(root, ".env.test.local");
  const localFile = path.join(root, ".env.local");
  const configFile = path.join(root, "supabase", "config.toml");
  const testValues = { ...readEnvFile(testFile), ...process.env };
  const localValues = readEnvFile(localFile);
  const configText = fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : "";
  const configuredRef = configText.match(/^project_id\s*=\s*["']([^"']+)["']/m)?.[1];
  const appRef = projectRefFromUrl(localValues.SUPABASE_URL ?? localValues.VITE_SUPABASE_URL ?? "");
  return assertIsolatedTestEnvironment(testValues, [configuredRef, appRef]);
}
