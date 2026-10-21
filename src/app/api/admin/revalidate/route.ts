import { adminApi } from "@/server/api/handler";

export const dynamic = "force-dynamic";
// After content is changed outside this API (a DB script, a direct Atlas edit): drops every cached public page now
// rather than within the hour (src/server/seo/public-cache.ts). The clearing itself is adminApi's, as after any write.
export const POST = adminApi(async () => ({ data: { revalidated: true } }), { requireRole: "administrator" });
