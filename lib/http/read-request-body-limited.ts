export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the configured size limit.");
    this.name = "RequestBodyTooLargeError";
  }
}

/**
 * Reads a request stream while enforcing a hard byte limit, even when the
 * Content-Length header is missing or inaccurate.
 */
export async function readRequestBodyLimited(request: Request, maxBytes: number): Promise<Buffer> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError("maxBytes must be a non-negative safe integer.");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && /^\d+$/.test(declaredLength)) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength > maxBytes) {
      throw new RequestBodyTooLargeError();
    }
  }

  if (!request.body) return Buffer.alloc(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      if (value.byteLength > maxBytes - totalBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }

      totalBytes += value.byteLength;
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* Stream may already be cancelled. */ }
  }

  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), totalBytes);
}
