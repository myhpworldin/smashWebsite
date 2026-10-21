import { publicPost } from "@/server/api/handler";
import { RATE_LIMITS } from "@/server/api/rate-limit";
import { forgotPasswordController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const POST = publicPost(forgotPasswordController, { rateLimit: RATE_LIMITS.clientCode, scope: "client-forgot" });
