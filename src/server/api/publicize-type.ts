import type { Media, Video } from "@/server/validation/media";
import type { PublicMedia, PublicVideo } from "@/server/media/public";

/**
 * `publicGet()` (src/server/api/handler.ts) runs every response through
 * `publicizeMedia`, which replaces every stored `Media`/`Video` object with its
 * `PublicMedia`/`PublicVideo` projection (adds `loading`, derives `format`,
 * builds `srcSet`) *after* a DTO function returns. A DTO's own return type
 * therefore does not describe the actual wire response for any field that
 * holds media — this type closes that gap so the exported response types
 * (`ServiceSummary`, `HomeResponse`, ...) describe what a consumer actually
 * receives, not the pre-projection shape. See CONTENT_CONTRACTS.md.
 */
export type Publicize<T> = T extends Media
  ? PublicMedia
  : T extends Video
    ? PublicVideo
    : T extends Date
      ? Date
      : T extends (infer U)[]
        ? Publicize<U>[]
        : T extends object
          ? { [K in keyof T]: Publicize<T[K]> }
          : T;
