/** Allowlisted public images. Private candidate CV URLs must never pass this validator. */
export function isApprovedMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000 || value.length === 0) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname === "images.unsplash.com") return /^\/photo-[\w-]+/.test(url.pathname);
    if (url.hostname === "drive.google.com" && url.pathname === "/thumbnail") {
      const id = url.searchParams.get("id") ?? "";
      return /^[\w-]{15,120}$/.test(id);
    }
    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!match || match[1] !== process.env.FIREBASE_STORAGE_BUCKET) return false;
      const objectPath = decodeURIComponent(match[2]);
      return /^public-media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(objectPath) &&
        url.searchParams.get("alt") === "media" &&
        /^[0-9a-f-]{36}$/i.test(url.searchParams.get("token") || "");
    }
    return false;
  } catch { return false; }
}

export function driveViewUrl(value: string | undefined): string | null {
  if (!isApprovedMediaUrl(value)) return null;
  try {
    const url = new URL(value);
    if (url.hostname !== "drive.google.com") return null;
    const id = url.searchParams.get("id") ?? "";
    return "https://drive.google.com/file/d/" + encodeURIComponent(id) + "/view";
  } catch { return null; }
}
