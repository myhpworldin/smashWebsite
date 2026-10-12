import { getEnv } from "@/server/config/env";
import { closeDb, getDb } from "@/server/db/client";
import { ensureSchema } from "@/server/db/helpers";
import { createAdminUser, findAdminUserByEmail } from "@/server/modules/admin-users/admin-users.service";

/**
 * Seeds the initial CRM admin account from ADMIN_EMAIL/ADMIN_PASSWORD (.env.example). Idempotent: if
 * an account with that email already exists, it is left untouched (never silently overwritten) and
 * this just reports that. Never prints the password, in either branch.
 */
async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = getEnv();
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must both be set (see .env.example) to seed the CRM admin account.");
  }

  const db = getDb();
  await ensureSchema(db);

  const existing = await findAdminUserByEmail(db, ADMIN_EMAIL.toLowerCase());
  if (existing) {
    console.log("Admin already exists.");
    return;
  }

  await createAdminUser(db, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log("Admin seed completed successfully.");
}

main().then(() => closeDb()).then(() => process.exit(0), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
