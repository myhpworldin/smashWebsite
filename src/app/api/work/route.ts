import { publicGet } from "@/server/api/handler";
import { listWorkController } from "@/server/api/public-content.controller";

export const dynamic = "force-dynamic";
export const GET = publicGet(listWorkController);
