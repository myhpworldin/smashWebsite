import { clientSessionApi } from "@/server/api/client-handler";
import { markSeenController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const POST = clientSessionApi(markSeenController, { stages: ["ready"] });
