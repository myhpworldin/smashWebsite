import { clientSessionApi } from "@/server/api/client-handler";
import { clientLogoutController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const POST = clientSessionApi(clientLogoutController, { stages: ["verify", "reset", "ready"] });
