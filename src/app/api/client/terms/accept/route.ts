import { clientSessionApi } from "@/server/api/client-handler";
import { acceptTermsController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const POST = clientSessionApi(acceptTermsController, { stages: ["ready"], scope: "client-portal" });
