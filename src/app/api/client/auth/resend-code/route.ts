import { clientSessionApi } from "@/server/api/client-handler";
import { RATE_LIMITS } from "@/server/api/rate-limit";
import { resendCodeController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const POST = clientSessionApi(resendCodeController, { stages: ["verify"], rateLimit: RATE_LIMITS.clientCode, scope: "client-resend" });
