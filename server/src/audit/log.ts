export type AuditAction = "enroll" | "verify" | "transfer";
export type AuditResult = "success" | "failure";

export interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  result: AuditResult;
  /** Null when the action failed before an identity could be resolved
   *  (e.g. an unknown username). */
  userId: string | null;
  username?: string;
  ip: string;
  reason?: string;
}

/** Structured audit trail for security-relevant actions (enroll, verify,
 *  transfer). Only identifiers and outcomes go in here - never raw audio,
 *  voiceprint embeddings, or session tokens. */
export function logAudit(entry: Omit<AuditEntry, "timestamp">): void {
  const record: AuditEntry = { timestamp: new Date().toISOString(), ...entry };
  // eslint-disable-next-line no-console
  console.log(`[voicebanking-server] audit ${JSON.stringify(record)}`);
}
