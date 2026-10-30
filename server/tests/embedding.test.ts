import { describe, expect, it } from "vitest";
import { AUDIO_SAMPLE_RATE } from "@voicebanking/shared";
import { averageEmbeddings, computeEmbedding, cosineSimilarity, MATCH_THRESHOLD } from "../src/voiceprint/embedding";

/** Synthesizes a crude "voice-like" tone: a fundamental plus a couple of
 *  harmonics (standing in for formants) and a little noise. Not real
 *  speech, but enough structure to sanity-check that the pipeline
 *  distinguishes different synthetic "speakers" (pitches/timbres) and is
 *  stable across repeated takes of the "same speaker". */
function synthVoice(f0: number, durationMs = 1500, noiseSeed = 1): Int16Array {
  const numSamples = Math.floor((AUDIO_SAMPLE_RATE * durationMs) / 1000);
  const samples = new Int16Array(numSamples);
  let seed = noiseSeed;
  const nextNoise = () => {
    // Simple LCG so tests are deterministic without external deps.
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

describe("computeEmbedding", () => {
  it("is deterministic for the same input", () => {
    const pcm = synthVoice(150);
    const a = computeEmbedding(pcm);
    const b = computeEmbedding(pcm);
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });

  it("returns null for clips shorter than one analysis frame", () => {
    const tooShort = new Int16Array(10);
    expect(computeEmbedding(tooShort)).toBeNull();
  });
});

describe("cosineSimilarity", () => {
  it("is ~1 for identical vectors", () => {
    const v = [0.2, 0.4, 0.8, 0.1];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("is -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 5);
  });
});

describe("enroll + verify round trip (synthetic signals, not real speech)", () => {
  it("matches the same synthetic 'speaker' across takes", () => {
    const enrollmentSamples = [1, 2, 3].map((seed) => computeEmbedding(synthVoice(150, 1500, seed))!);
    const template = averageEmbeddings(enrollmentSamples);

    const liveSample = computeEmbedding(synthVoice(150, 1500, 99))!;
    const score = cosineSimilarity(liveSample, template);

    expect(score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
  });

  it("rejects a clearly different synthetic 'speaker'", () => {
    const enrollmentSamples = [1, 2, 3].map((seed) => computeEmbedding(synthVoice(150, 1500, seed))!);
    const template = averageEmbeddings(enrollmentSamples);

    const impostorSample = computeEmbedding(synthVoice(420, 1500, 7))!;
    const score = cosineSimilarity(impostorSample, template);

    expect(score).toBeLessThan(MATCH_THRESHOLD);
  });
});
