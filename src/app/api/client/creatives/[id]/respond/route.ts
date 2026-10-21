import { clientSessionApi } from "@/server/api/client-handler";
import { respondToCreativeController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const POST = clientSessionApi(respondToCreativeController, { stages: ["ready"], scope: "client-portal" });
