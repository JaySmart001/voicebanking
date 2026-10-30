/**
 * Low-level signal-processing primitives for the voiceprint pipeline.
 * Everything here is plain DSP math - no ML libraries involved.
 */

export const FRAME_SIZE = 400; // 25ms at 16kHz
export const FRAME_STRIDE = 160; // 10ms at 16kHz
export const FFT_SIZE = 512; // next power of two >= FRAME_SIZE
export const PRE_EMPHASIS = 0.97;

/** Boosts high frequencies that are naturally attenuated by human speech
 *  production, which makes the later spectral features more discriminative. */
export function preEmphasize(samples: Float32Array, coefficient = PRE_EMPHASIS): Float32Array {
  const out = new Float32Array(samples.length);
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    out[i] = samples[i] - coefficient * samples[i - 1];
  }
  return out;
}

/** Splits a signal into overlapping fixed-size frames. Short trailing
 *  samples that don't fill a full frame are dropped. */
export function frameSignal(
  samples: Float32Array,
  frameSize = FRAME_SIZE,
  frameStride = FRAME_STRIDE
): Float32Array[] {
  const frames: Float32Array[] = [];
  if (samples.length < frameSize) return frames;
  for (let start = 0; start + frameSize <= samples.length; start += frameStride) {
    frames.push(samples.subarray(start, start + frameSize));
  }
  return frames;
}

/** Precomputed Hamming window coefficients for a given frame size, tapering
 *  frame edges to reduce spectral leakage before the FFT. */
export function hammingWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
  }
  return window;
}

export function applyWindow(frame: Float32Array, window: Float32Array): Float32Array {
  const out = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) {
    out[i] = frame[i] * window[i];
  }
  return out;
}

/** Converts PCM16 samples to normalized Float32 in [-1, 1]. */
export function pcm16ToFloat32(pcm: Int16Array): Float32Array {
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    out[i] = pcm[i] / 32768;
  }
  return out;
}
