import type { Server } from "http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 4000;
  baseUrl = `http://localhost:${port}`;
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rate limiting", () => {
  it("returns 429 with a clear error once an IP exceeds the enroll limit", async () => {
    // The enroll body is intentionally invalid (missing fields) - we only
    // care that the rate limiter trips before/regardless of the route's
    // own validation, so this stays fast and doesn't need real audio.
    let lastRes: Response | undefined;
    for (let i = 0; i < 6; i++) {
      lastRes = await fetch(`${baseUrl}/api/auth/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (i < 5) {
        expect(lastRes.status).toBe(400);
      }
    }

    expect(lastRes!.status).toBe(429);
    const body = await lastRes!.json();
    expect(body.error).toMatch(/too many/i);
  });
});

describe("audit logging", () => {
  it("writes a structured audit entry when a verify attempt fails, with no sensitive payload", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const res = await fetch(`${baseUrl}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "audit_test_user",
        challengeId: "nonexistent-challenge-id",
        sample: "not-real-audio",
      }),
    });
    const body = await res.json();
    expect(body.success).toBe(false);

    const auditLine = logSpy.mock.calls
      .map(([line]) => String(line))
      .find((line) => line.startsWith("[voicebanking-server] audit "));
    expect(auditLine).toBeDefined();

    const entry = JSON.parse(auditLine!.replace("[voicebanking-server] audit ", ""));
    expect(entry).toMatchObject({
      action: "verify",
      result: "failure",
      username: "audit_test_user",
    });
    expect(typeof entry.timestamp).toBe("string");
    expect(typeof entry.ip).toBe("string");

    // Never log raw audio, voiceprints, or tokens.
    const serialized = auditLine!;
    expect(serialized).not.toContain("not-real-audio");
    expect(entry.sample).toBeUndefined();
    expect(entry.token).toBeUndefined();
    expect(entry.embedding).toBeUndefined();
  });
});
