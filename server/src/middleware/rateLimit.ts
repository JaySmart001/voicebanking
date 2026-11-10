import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const sharedOptions = {
  standardHeaders: true as const,
  legacyHeaders: false,
};

/** Challenges are single-use and expire after 60s (see auth/challenge.ts),
 *  so capping how many a client can mint already bounds how many verify
 *  attempts they can make. Generous enough to cover mic/retry fumbling. */
export const challengeLimiter = rateLimit({
  ...sharedOptions,
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 20,
  message: { error: "Too many challenge requests from this IP. Please wait a few minutes and try again." },
});

/** Enrolling creates a new account; a real user does this once. Repeated
 *  enrollment from one IP is registration spam, not normal use. */
export const enrollLimiter = rateLimit({
  ...sharedOptions,
  windowMs: ONE_HOUR_MS,
  limit: 5,
  message: { error: "Too many enrollment attempts from this IP. Please wait before trying again." },
});

/** Bounds voice brute-force / replay attempts from a single source. */
export const verifyIpLimiter = rateLimit({
  ...sharedOptions,
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  message: { error: "Too many verification attempts from this IP. Please wait a few minutes and try again." },
});

/** Bounds attempts against a single account even if spread across many
 *  IPs (credential-stuffing-style attack). Falls back to the IP-based key
 *  when no username is present on the request. */
export const verifyUserLimiter = rateLimit({
  ...sharedOptions,
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  keyGenerator: (req) => {
    const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
    return username ? `user:${username}` : ipKeyGenerator(req.ip ?? "");
  },
  message: { error: "Too many verification attempts for this account. Please wait a few minutes and try again." },
});
