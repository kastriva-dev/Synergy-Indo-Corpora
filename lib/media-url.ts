/** Allowed publicly hosted images. The company currently uses Drive or Unsplash.
 * Keeping a domain allowlist prevents accidental insertion of arbitrary tracking URLs.
 * Add approved media hosts here only after reviewing their privacy and hotlink rules.
 */
export function isApprovedMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 700 || value.length === 0) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname === "images.unsplash.com") return /^\/photo-[\w-]+/.test(url.pathname);
    if (url.hostname === "drive.google.com" && url.pathname === "/thumbnail") {
      const id = url.searchParams.get("id") ?? "";
      return /^[\w-]{15,120}$/.test(id);
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
    return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
  } catch { return null; }
}
