import { adminSessionApi } from "@/server/api/handler";
import { getWorkspaceController, saveWorkspaceController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const GET = adminSessionApi(getWorkspaceController);
export const PUT = adminSessionApi(saveWorkspaceController);
