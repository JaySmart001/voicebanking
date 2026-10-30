import type { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AUDIO_SAMPLE_RATE, int16ArrayToBase64 } from "@voicebanking/shared";
import { createApp } from "../src/app";

function synthVoice(f0: number, durationMs = 1500, noiseSeed = 1): Int16Array {
  const numSamples = Math.floor((AUDIO_SAMPLE_RATE * durationMs) / 1000);
  const samples = new Int16Array(numSamples);
  let seed = noiseSeed;
  const nextNoise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };
  for (let i = 0; i < numSamples; i++) {
    const t = i / AUDIO_SAMPLE_RATE;
    const value =
      0.6 * Math.sin(2 * Math.PI * f0 * t) +
      0.3 * Math.sin(2 * Math.PI * f0 * 2 * t) +
      0.15 * Math.sin(2 * Math.PI * f0 * 3.3 * t) +
      0.02 * nextNoise();
    samples[i] = Math.max(-32768, Math.min(32767, Math.round(value * 10000)));
  }
  return samples;
}

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

describe("full enroll -> challenge -> verify -> bank flow", () => {
  const username = `test_user_${Date.now()}`;

  it("enrolls a new user with 3 voice samples", async () => {
    const samples = [1, 2, 3].map((seed) => int16ArrayToBase64(synthVoice(150, 1500, seed)));
    const res = await fetch(`${baseUrl}/api/auth/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: "Test User", samples }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("enrolled");
  });

  it("rejects verification with the wrong voice", async () => {
    const challengeRes = await fetch(`${baseUrl}/api/auth/challenge`, { method: "POST" });
    const challenge = await challengeRes.json();

    const sample = int16ArrayToBase64(synthVoice(420, 1500, 42));
    const res = await fetch(`${baseUrl}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId: challenge.challengeId, sample }),
    });
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("verifies with the matching voice and returns a usable token", async () => {
    const challengeRes = await fetch(`${baseUrl}/api/auth/challenge`, { method: "POST" });
    const challenge = await challengeRes.json();

    const sample = int16ArrayToBase64(synthVoice(150, 1500, 7));
    const res = await fetch(`${baseUrl}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId: challenge.challengeId, sample }),
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe("string");

    const accountsRes = await fetch(`${baseUrl}/api/bank/accounts`, {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(accountsRes.status).toBe(200);
    const accountsBody = await accountsRes.json();
    expect(accountsBody.accounts.length).toBe(2);
  });

  it("rejects bank routes without a token", async () => {
    const res = await fetch(`${baseUrl}/api/bank/accounts`);
    expect(res.status).toBe(401);
  });

  it("a single challenge cannot be reused (anti-replay)", async () => {
    const challengeRes = await fetch(`${baseUrl}/api/auth/challenge`, { method: "POST" });
    const challenge = await challengeRes.json();
    const sample = int16ArrayToBase64(synthVoice(150, 1500, 11));

    const first = await fetch(`${baseUrl}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId: challenge.challengeId, sample }),
    });
    expect((await first.json()).success).toBe(true);

    const second = await fetch(`${baseUrl}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId: challenge.challengeId, sample }),
    });
    const secondBody = await second.json();
    expect(secondBody.success).toBe(false);
  });
});
