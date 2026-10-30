/**
 * VoiceBank API contract v1.
 *
 * Audio format for every endpoint that carries a voice sample:
 * mono, 16-bit signed little-endian PCM, 16kHz sample rate, base64-encoded
 * raw sample bytes (no WAV/container header). Both the web client (via
 * Web Audio API resampling) and the native mobile modules (AudioRecord /
 * AVAudioEngine configured at 16kHz mono) produce this same shape, so the
 * server-side voiceprint engine only has to understand one format.
 */
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_BITS_PER_SAMPLE = 16;
export const MIN_ENROLLMENT_SAMPLES = 3;
export const MIN_SAMPLE_DURATION_MS = 1200;

export interface ChallengeResponse {
  challengeId: string;
  phrase: string;
  expiresAt: string; // ISO timestamp
}

export interface EnrollRequest {
  username: string;
  displayName: string;
  /** Base64 PCM16 samples, one per repetition of the enrollment phrase. */
  samples: string[];
}

export interface EnrollResponse {
  userId: string;
  status: "enrolled";
}

export interface VerifyRequest {
  username: string;
  challengeId: string;
  /** Base64 PCM16 sample of the user speaking the challenge phrase. */
  sample: string;
  /** Optional transcript from on-device speech recognition, used as a
   *  second factor to confirm the correct phrase was spoken (anti-replay). */
  transcript?: string;
}

export interface VerifyResponse {
  success: boolean;
  token?: string;
  reason?: string;
  /** Cosine similarity score against the enrolled voiceprint, 0-1.
   *  Exposed for demo/debugging transparency, not a production field. */
  score?: number;
}

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings";
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO timestamp
  description: string;
  amount: number; // negative = debit, positive = credit
}

export interface AccountsResponse {
  accounts: Account[];
}

export interface TransactionsResponse {
  transactions: Transaction[];
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  memo?: string;
}

export interface TransferResponse {
  success: boolean;
  reason?: string;
  accounts?: Account[];
}

export interface ApiErrorBody {
  error: string;
}
