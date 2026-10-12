import "server-only";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import type { SessionController, WriteController } from "@/server/api/handler";
import { clearAdminSessionCookie, setAdminSessionCookie } from "@/server/api/admin-session";
import { adminLoginSchema } from "@/server/modules/admin-users/admin-users.schema";
import { verifyAdminCredentials } from "@/server/modules/admin-users/admin-users.service";

/**
 * `POST /api/admin/auth/login`. Deliberately generic on every failure (unknown email, wrong password,
 * inactive account): `verifyAdminCredentials` already collapses those into one `null`, and this
 * controller does not re-derive which one it was — avoiding user enumeration (CRM Phase 2 brief,
 * "Login error behavior").
 */
export const loginController: WriteController = async ({ db, body }) => {
  const { email, password } = adminLoginSchema.parse(body);
  const admin = await verifyAdminCredentials(db, email, password);
  if (!admin) {
    logger.warn("Admin login failed", { email }); // the email, never the password — logger.redact() would mask it anyway if it were
    throw new AppError("UNAUTHORIZED", 401, "Invalid email or password.");
  }
  await setAdminSessionCookie(admin.id);
  return { data: admin };
};

/** `GET /api/admin/auth/me`. `admin` already comes from `adminSessionApi`'s own database re-check — nothing further to verify here. */
export const meController: SessionController = async ({ admin }) => ({ data: admin });

/** `POST /api/admin/auth/logout`. Clearing the cookie is the entire session invalidation strategy (stateless tokens have nothing server-side to revoke); the next request without a cookie fails `requireAdminSession` the same way an expired or forged one does. */
export const logoutController: SessionController = async () => {
  await clearAdminSessionCookie();
  return { data: { loggedOut: true } };
};
