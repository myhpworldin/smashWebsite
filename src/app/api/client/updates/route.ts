import { clientSessionApi } from "@/server/api/client-handler";
import { updatesController } from "@/server/api/client-auth.controller";

export const dynamic = "force-dynamic";
export const GET = clientSessionApi(updatesController, { stages: ["ready"] });
