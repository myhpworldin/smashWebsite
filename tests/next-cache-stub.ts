// `next/cache` outside the Next.js server: revalidatePath needs the request's cache store, which plain Node lacks.
// Calls are recorded instead, so a test can check that a write cleared the public page cache.
export const revalidatedPaths: { path: string; type?: string }[] = [];

export function revalidatePath(path: string, type?: "page" | "layout") {
  revalidatedPaths.push({ path, type });
}
