import { publicGet } from "@/server/api/handler";
import { getInsightController } from "@/server/api/public-content.controller";

export const dynamic = "force-dynamic";
export const GET = publicGet(getInsightController);
