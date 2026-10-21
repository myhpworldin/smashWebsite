import { adminSessionApi } from "@/server/api/handler";
import { signUploadController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const POST = adminSessionApi(signUploadController);
