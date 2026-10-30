/**
 * ============================================================================
 *  DEMO-GRADE VOICEPRINT ENGINE - READ BEFORE REUSING ELSEWHERE
 * ============================================================================
 * This computes a 26-dimensional embedding (mean + std of 13 MFCCs across
 * frames) from raw PCM16 audio and compares embeddings with cosine
 * similarity. It is a hand-rolled, classical-DSP speaker-verification
 * approach, built to demonstrate the full voice-auth pipeline end to end.
 *
 * It is NOT equivalent to production biometric security. Real voice
 * authentication products use neural speaker-embedding models (d-vectors /
 * x-vectors trained on thousands of speakers) plus dedicated anti-spoofing
 * and liveness detection to resist replay attacks, recordings, and
 * synthetic/deepfake speech. MFCC+cosine-similarity alone can be fooled by
 * a decent recording of the enrolled user. Do not present this module as
 * bank-grade security without replacing it with (or layering it under) a
 * real vendor SDK - see docs/SECURITY.md in the repo root.
 * ============================================================================
 */
import FFT from "fft.js";
import { AUDIO_SAMPLE_RATE } from "@voicebanking/shared";
import {
  FFT_SIZE,
  applyWindow,
  frameSignal,
  hammingWindow,
  pcm16ToFloat32,
  preEmphasize,
} from "./dsp";
import { applyMelFilterbank, buildMelFilterbank, dct, NUM_CEPSTRAL_COEFFS } from "./mel";

/** Cosine-similarity threshold above which a verification attempt is
 *  considered a match. Tuned empirically for this demo; a production
 *  system would calibrate this (and the whole scoring approach) against
 *  a real enrolled-speaker dataset with FAR/FRR curves. */
export const MATCH_THRESHOLD = 0.82;

export const EMBEDDING_DIM = NUM_CEPSTRAL_COEFFS * 2; // mean + std per coefficient

const melFilters = buildMelFilterbank(AUDIO_SAMPLE_RATE, FFT_SIZE);
const window = hammingWindow(400);
const fft = new FFT(FFT_SIZE);

function magnitudeSpectrum(frame: Float32Array): Float64Array {
  const padded = new Float64Array(FFT_SIZE);
  padded.set(frame);

  const complexInput = fft.createComplexArray();
  fft.toComplexArray(padded, complexInput);

  const complexOutput = fft.createComplexArray();
  fft.transform(complexOutput, complexInput);

  const numBins = FFT_SIZE / 2 + 1;
  const power = new Float64Array(numBins);
  for (let i = 0; i < numBins; i++) {
    const re = complexOutput[2 * i];
    const im = complexOutput[2 * i + 1];
    power[i] = re * re + im * im;
  }
  return power;
}

function mfccForFrame(windowedFrame: Float32Array): Float64Array {
  const power = magnitudeSpectrum(windowedFrame);
  const logEnergies = applyMelFilterbank(power, melFilters);
  return dct(logEnergies, NUM_CEPSTRAL_COEFFS);
}

/** Computes a fixed-length (mean + std of 13 MFCCs = 26-dim), L2-normalized
 *  embedding for one audio clip. Returns null if the clip is too short to
 *  produce at least one analysis frame. */
export function computeEmbedding(pcm: Int16Array): number[] | null {
  const float = preEmphasize(pcm16ToFloat32(pcm));
  const frames = frameSignal(float);
  if (frames.length === 0) return null;

  const coeffsPerFrame: Float64Array[] = frames.map((frame) => mfccForFrame(applyWindow(frame, window)));

  const mean = new Float64Array(NUM_CEPSTRAL_COEFFS);
  for (const coeffs of coeffsPerFrame) {
    for (let i = 0; i < NUM_CEPSTRAL_COEFFS; i++) mean[i] += coeffs[i];
  }
  for (let i = 0; i < NUM_CEPSTRAL_COEFFS; i++) mean[i] /= coeffsPerFrame.length;

  const std = new Float64Array(NUM_CEPSTRAL_COEFFS);
  for (const coeffs of coeffsPerFrame) {
    for (let i = 0; i < NUM_CEPSTRAL_COEFFS; i++) {
      const diff = coeffs[i] - mean[i];
      std[i] += diff * diff;
    }
  }
  for (let i = 0; i < NUM_CEPSTRAL_COEFFS; i++) std[i] = Math.sqrt(std[i] / coeffsPerFrame.length);

  const raw = [...Array.from(mean), ...Array.from(std)];
  return l2Normalize(raw);
}

export function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Embedding dimension mismatch");
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Averages multiple enrollment-sample embeddings into one template. */
export function averageEmbeddings(embeddings: number[][]): number[] {
  const dim = embeddings[0].length;
  const sum = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) sum[i] += emb[i];
  }
  const mean = sum.map((v) => v / embeddings.length);
  return l2Normalize(mean);
}
