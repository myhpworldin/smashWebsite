import type { ApiFailure, ApiSuccess } from "@/server/lib/response";

/**
 * Client-side fetch helper for `/api/**`. Server components should keep
 * calling the in-process service functions directly (the existing, faster
 * convention — see FRONTEND_INTEGRATION.md); this exists for a future client
 * component that needs to fetch after the initial render (e.g. a "load more"
 * button). Always same-origin and relative — no separate public API base URL
 * is needed or should be introduced (phase brief §27: no server secret is
 * exposed, and no new env var is required for this to work in any tier).
 */
export type ApiResult<T, M = undefined> = ApiSuccess<T, M> | ApiFailure;

export async function apiFetch<T, M = undefined>(path: string, init?: RequestInit): Promise<ApiResult<T, M>> {
  const res = await fetch(path, init);
  return (await res.json()) as ApiResult<T, M>;
}

/** Narrows an `ApiResult` — use instead of checking `success` inline everywhere. */
export function isApiSuccess<T, M>(result: ApiResult<T, M>): result is ApiSuccess<T, M> {
  return result.success;
}
