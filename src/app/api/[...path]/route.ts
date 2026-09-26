import { AppError } from "@/server/lib/errors";
import { fail } from "@/server/lib/response";

// Unknown /api paths get the standard JSON envelope instead of an HTML 404 page.
export const dynamic = "force-dynamic";
const notFound = (request: Request) => fail(AppError.notFound("endpoint"), { request: { method: request.method, path: new URL(request.url).pathname } });
export const GET = notFound;
