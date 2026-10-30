import jwt from "jsonwebtoken";

const DEV_FALLBACK_SECRET = "voicebanking-dev-insecure-secret-do-not-use-in-production";

export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  // eslint-disable-next-line no-console
  console.warn(
    "[voicebanking-server] WARNING: JWT_SECRET is not set. Using an insecure development fallback. " +
      "Set JWT_SECRET in your environment before deploying this anywhere real."
  );
  return DEV_FALLBACK_SECRET;
}

export interface SessionPayload {
  userId: string;
  username: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "15m" });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, getJwtSecret()) as SessionPayload;
}
