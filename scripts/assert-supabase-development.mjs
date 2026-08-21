const required = [
  "SUPABASE_TARGET_ENV",
  "SUPABASE_DEV_PROJECT_REF",
];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const targetEnvironment = process.env.SUPABASE_TARGET_ENV.trim().toLowerCase();
const developmentRef = process.env.SUPABASE_DEV_PROJECT_REF.trim();
const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF?.trim();

if (targetEnvironment !== "development") {
  console.error("Refusing to run: SUPABASE_TARGET_ENV must equal development.");
  process.exit(1);
}

if (productionRef && developmentRef === productionRef) {
  console.error("Refusing to run: development and production project refs are identical.");
  process.exit(1);
}

for (const urlName of ["SUPABASE_DEV_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
  const value = process.env[urlName]?.trim();
  if (!value) continue;

  let hostname;
  try {
    hostname = new URL(value).hostname;
  } catch {
    console.error(`Refusing to run: ${urlName} is not a valid URL.`);
    process.exit(1);
  }

  if (hostname !== `${developmentRef}.supabase.co`) {
    console.error(`Refusing to run: ${urlName} does not match SUPABASE_DEV_PROJECT_REF.`);
    process.exit(1);
  }
}

console.log(`Development target verified: ${developmentRef}`);
