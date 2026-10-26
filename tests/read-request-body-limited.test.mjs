import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readRequestBodyLimited,
  RequestBodyTooLargeError,
} from "../lib/http/read-request-body-limited.ts";

function requestWithStream(chunks, headers = {}) {
  let index = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index++]);
    },
  });
  return new Request("https://example.test/upload", {
    method: "POST",
    headers,
    body,
    duplex: "half",
  });
}

test("accepts a binary request body exactly at the configured limit", async () => {
  const request = requestWithStream([
    Uint8Array.from([0, 255]),
    Uint8Array.from([17, 34]),
  ]);
  const result = await readRequestBodyLimited(request, 4);
  assert.deepEqual(result, Buffer.from([0, 255, 17, 34]));
});

test("rejects an oversized streamed body even without Content-Length", async () => {
  const request = requestWithStream([
    Uint8Array.from([1, 2]),
    Uint8Array.from([3, 4]),
  ]);
  await assert.rejects(
    readRequestBodyLimited(request, 3),
    RequestBodyTooLargeError,
  );
});

test("rejects a declared oversized body before reading the stream", async () => {
  const request = requestWithStream(
    [Uint8Array.from([1, 2])],
    { "content-length": "4096" },
  );
  await assert.rejects(
    readRequestBodyLimited(request, 10),
    RequestBodyTooLargeError,
  );
});

test("rejects invalid limits", async () => {
  const request = requestWithStream([Uint8Array.from([1])]);
  await assert.rejects(readRequestBodyLimited(request, -1), RangeError);
});
