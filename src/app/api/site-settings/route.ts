import { publicGet } from "@/server/api/handler";
import { siteSettingsController } from "@/server/api/public-content.controller";

export const dynamic = "force-dynamic";
export const GET = publicGet(siteSettingsController);
