import { Router } from "express";
import { v4 as uuid } from "uuid";
import {
  base64ToInt16Array,
  ChallengeResponse,
  EnrollRequest,
  EnrollResponse,
  MIN_ENROLLMENT_SAMPLES,
  VerifyRequest,
  VerifyResponse,
} from "@voicebanking/shared";
import { findUserByUsername, readDb, writeDb } from "../db";
import { seedAccountsAndTransactions } from "../bank/mock";
import { averageEmbeddings, computeEmbedding, cosineSimilarity, MATCH_THRESHOLD } from "../voiceprint/embedding";
import { consumeChallenge, createChallenge, transcriptMatchesChallenge } from "./challenge";
import { signSession } from "./jwt";

export const authRouter = Router();

authRouter.post("/challenge", (_req, res) => {
  const { challengeId, phrase, expiresAtIso } = createChallenge();
  const body: ChallengeResponse = { challengeId, phrase, expiresAt: expiresAtIso };
  res.json(body);
});

authRouter.post("/enroll", (req, res) => {
  const { username, displayName, samples } = req.body as EnrollRequest;

  if (!username || !displayName || !Array.isArray(samples)) {
    return res.status(400).json({ error: "username, displayName, and samples are required" });
  }
  if (samples.length < MIN_ENROLLMENT_SAMPLES) {
    return res.status(400).json({ error: `At least ${MIN_ENROLLMENT_SAMPLES} voice samples are required` });
  }

  const db = readDb();
  if (findUserByUsername(db, username)) {
    return res.status(409).json({ error: "Username already enrolled" });
  }

  const embeddings: number[][] = [];
  for (const sample of samples) {
    const pcm = base64ToInt16Array(sample);
    const embedding = computeEmbedding(pcm);
    if (!embedding) {
      return res.status(400).json({ error: "One or more voice samples were too short to analyze" });
    }
    embeddings.push(embedding);
  }

  const userId = `user_${uuid()}`;
  db.users.push({
    userId,
    username,
    displayName,
    embedding: averageEmbeddings(embeddings),
    createdAt: new Date().toISOString(),
  });

  const { accounts, transactions } = seedAccountsAndTransactions(userId);
  db.accounts.push(...accounts);
  db.transactions.push(...transactions);

  writeDb(db);

  const body: EnrollResponse = { userId, status: "enrolled" };
  res.status(201).json(body);
});

authRouter.post("/verify", (req, res) => {
  const { username, challengeId, sample, transcript } = req.body as VerifyRequest;

  if (!username || !challengeId || !sample) {
    return res.status(400).json({ error: "username, challengeId, and sample are required" });
  }

  const challenge = consumeChallenge(challengeId);
  if (!challenge) {
    const body: VerifyResponse = { success: false, reason: "Challenge expired or already used" };
    return res.status(200).json(body);
  }

  if (transcript && !transcriptMatchesChallenge(transcript, challenge)) {
    const body: VerifyResponse = { success: false, reason: "Spoken phrase did not match the challenge" };
    return res.status(200).json(body);
  }

  const db = readDb();
  const user = findUserByUsername(db, username);
  if (!user) {
    const body: VerifyResponse = { success: false, reason: "Unknown username" };
    return res.status(200).json(body);
  }

  const pcm = base64ToInt16Array(sample);
  const embedding = computeEmbedding(pcm);
  if (!embedding) {
    const body: VerifyResponse = { success: false, reason: "Voice sample was too short to analyze" };
    return res.status(200).json(body);
  }

  const score = cosineSimilarity(embedding, user.embedding);
  if (score < MATCH_THRESHOLD) {
    const body: VerifyResponse = { success: false, reason: "Voice did not match enrolled voiceprint", score };
    return res.status(200).json(body);
  }

  const token = signSession({ userId: user.userId, username: user.username });
  const body: VerifyResponse = { success: true, token, score };
  res.status(200).json(body);
});
