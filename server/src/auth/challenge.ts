import { v4 as uuid } from "uuid";

const CHALLENGE_TTL_MS = 60_000;

const PHRASE_BANK = [
  "My voice is my password",
  "Verify me with the sound of my voice",
  "Open my account using my voice",
  "This is truly my voice speaking",
  "Confirm my identity by my voice",
  "I am who my voice says I am",
  "Let my voice unlock my account",
  "Here is my voice as proof",
  "My voice confirms this transaction",
  "Listen closely, this is my voice",
  "Grant me access by my voice",
  "My spoken voice is the key",
  "Authenticate me through my voice",
  "This voice belongs to the account owner",
  "Recognize my voice and let me in",
];

interface StoredChallenge {
  phrase: string;
  code: string;
  expiresAt: number;
}

const activeChallenges = new Map<string, StoredChallenge>();

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function createChallenge(): { challengeId: string; phrase: string; expiresAtIso: string } {
  const base = PHRASE_BANK[Math.floor(Math.random() * PHRASE_BANK.length)];
  const code = randomCode();
  const phrase = `${base}, number ${code}`;
  const challengeId = uuid();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  activeChallenges.set(challengeId, { phrase, code, expiresAt });

  // Opportunistic cleanup of stale challenges so the map doesn't grow forever.
  for (const [id, challenge] of activeChallenges) {
    if (challenge.expiresAt < Date.now()) activeChallenges.delete(id);
  }

  return { challengeId, phrase, expiresAtIso: new Date(expiresAt).toISOString() };
}

/** Single-use: consuming a challenge removes it, so a captured request/reply
 *  can't be replayed against the same challengeId. */
export function consumeChallenge(challengeId: string): StoredChallenge | null {
  const challenge = activeChallenges.get(challengeId);
  if (!challenge) return null;
  activeChallenges.delete(challengeId);
  if (challenge.expiresAt < Date.now()) return null;
  return challenge;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

/** Fuzzy check that the recognized transcript plausibly matches the issued
 *  phrase: the 4-digit code must appear, and most phrase words should be
 *  present. This is a second factor confirming the right phrase was
 *  spoken (anti-replay), not a general-purpose speech-matching algorithm. */
export function transcriptMatchesChallenge(transcript: string, challenge: StoredChallenge): boolean {
  const normalizedTranscript = normalize(transcript);
  if (!normalizedTranscript.includes(challenge.code)) return false;

  const phraseWords = normalize(challenge.phrase.replace(challenge.code, "")).split(/\s+/).filter(Boolean);
  const transcriptWords = new Set(normalizedTranscript.split(/\s+/));
  const matchedWords = phraseWords.filter((w) => transcriptWords.has(w));
  return matchedWords.length / phraseWords.length >= 0.6;
}
