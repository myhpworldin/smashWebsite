import { getEnv } from "@/server/config/env";
import { fail, ok } from "@/server/lib/response";

// Liveness plus configuration: a deploy with missing or invalid environment variables fails its
// health check (the log names the variables). The response reveals nothing about the environment
// and does not touch the database, so a database outage does not take the health check down.
export const dynamic = "force-dynamic";

export function GET() {
  try {
    getEnv();
    return ok({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return fail(err);
  }
}
