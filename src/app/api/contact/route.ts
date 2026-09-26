import { publicPost } from "@/server/api/handler";
import { submitEnquiryController } from "@/server/api/public-content.controller";

export const dynamic = "force-dynamic";
export const POST = publicPost(submitEnquiryController);
