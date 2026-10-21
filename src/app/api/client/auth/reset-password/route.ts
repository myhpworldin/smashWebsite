import { clientSessionApi } from "@/server/api/client-handler";
import { RATE_LIMITS } from "@/server/api/rate-limit";
import { resetPasswordController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const POST = clientSessionApi(resetPasswordController, { stages: ["reset", "ready"], rateLimit: RATE_LIMITS.clientAuth, scope: "client-reset" });
