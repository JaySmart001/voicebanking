import fs from "fs";
import path from "path";
import { Account, Transaction } from "@voicebanking/shared";

export interface StoredUser {
  userId: string;
  username: string;
  displayName: string;
  embedding: number[];
  createdAt: string;
}

/** Accounts/transactions as persisted, scoped to an owning user. The
 *  `userId` field is stripped before these are sent to clients (see
 *  bank/routes.ts) since it's not part of the public Account/Transaction
 *  contract in @voicebanking/shared. */
export type StoredAccount = Account & { userId: string };
export type StoredTransaction = Transaction & { userId: string };

export interface DbShape {
  users: StoredUser[];
  accounts: StoredAccount[];
  transactions: StoredTransaction[];
}

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const EMPTY_DB: DbShape = { users: [], accounts: [], transactions: [] };

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDb(): DbShape {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
    return structuredClone(EMPTY_DB);
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    return JSON.parse(raw) as DbShape;
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

export function writeDb(db: DbShape): void {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function findUserByUsername(db: DbShape, username: string): StoredUser | undefined {
  return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}
