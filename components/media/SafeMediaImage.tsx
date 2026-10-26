"use client";

import { useEffect, useState } from "react";
import { driveViewUrl, isApprovedMediaUrl } from "@/lib/media-url";

/** Render a branded placeholder instead of a broken Drive thumbnail.
 * A broken thumbnail is not evidence that the file was deleted.
 * Google Drive is not an image CDN and may block third-party embeds intermittently.
 */
export default function SafeMediaImage({ src, alt, className, showDriveLink = false, loading = "lazy" }: {
  src?: string;
  alt: string;
  className?: string;
  showDriveLink?: boolean;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const safe = isApprovedMediaUrl(src);
  const useFallback = failed || !safe;
  const driveLink = showDriveLink ? driveViewUrl(src) : null;
  return <>
    {/* The local SVG loads even when Drive is unavailable. Never retry endlessly. */}
    <img
      className={className}
      src={useFallback ? "/media-unavailable.svg" : src}
      alt={useFallback ? `${alt} — pratinjau tidak tersedia` : alt}
      loading={loading}
      decoding="async"
      onError={() => { if (!failed) setFailed(true); }}
    />
    {useFallback && driveLink && <a className="admin-media-open" href={driveLink} target="_blank" rel="noopener noreferrer">Periksa file di Google Drive ↗</a>}
  </>;
}
