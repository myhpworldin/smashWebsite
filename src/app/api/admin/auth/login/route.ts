import { publicPost } from "@/server/api/handler";
import { RATE_LIMITS } from "@/server/api/rate-limit";
import { loginController } from "@/server/api/crm-auth.controller";

export const dynamic = "force-dynamic";
export const POST = publicPost(loginController, { rateLimit: RATE_LIMITS.adminAuth, scope: "admin-auth" });
