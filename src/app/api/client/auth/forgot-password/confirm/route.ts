import { publicPost } from "@/server/api/handler";
import { RATE_LIMITS } from "@/server/api/rate-limit";
import { resetWithCodeController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const POST = publicPost(resetWithCodeController, { rateLimit: RATE_LIMITS.clientCode, scope: "client-forgot-confirm" });
