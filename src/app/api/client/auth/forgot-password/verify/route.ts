import { publicPost } from "@/server/api/handler";
import { RATE_LIMITS } from "@/server/api/rate-limit";
import { verifyResetCodeController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const POST = publicPost(verifyResetCodeController, { rateLimit: RATE_LIMITS.clientCode, scope: "client-forgot-verify" });
