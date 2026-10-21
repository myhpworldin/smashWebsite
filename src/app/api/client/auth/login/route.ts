import { publicPost } from "@/server/api/handler";
import { RATE_LIMITS } from "@/server/api/rate-limit";
import { clientLoginController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const POST = publicPost(clientLoginController, { rateLimit: RATE_LIMITS.clientAuth, scope: "client-auth" });
