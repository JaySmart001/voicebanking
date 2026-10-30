/**
 * Base64 <-> PCM16 helpers that work the same in the browser, React Native's
 * JS engine, and Node - no reliance on Node's Buffer or the DOM btoa/atob
 * globals, since not all three environments provide both.
 */
const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;

    const triple = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);

    result += BASE64_CHARS[(triple >> 18) & 0x3f];
    result += BASE64_CHARS[(triple >> 12) & 0x3f];
    result += b1 === undefined ? "=" : BASE64_CHARS[(triple >> 6) & 0x3f];
    result += b2 === undefined ? "=" : BASE64_CHARS[triple & 0x3f];
  }
  return result;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

export function int16ArrayToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  return bytesToBase64(bytes);
}

export function base64ToInt16Array(base64: string): Int16Array {
  const bytes = base64ToBytes(base64);
  // Ensure even length (PCM16 = 2 bytes/sample); trim a stray trailing byte.
  const usable = bytes.length - (bytes.length % 2);
  return new Int16Array(bytes.buffer, bytes.byteOffset, usable / 2);
}

/** Converts Float32 samples in [-1, 1] (Web Audio's native format) to PCM16. */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return out;
}
