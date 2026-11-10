import { Router } from "express";
import { Account, Transaction, TransferRequest, TransferResponse } from "@voicebanking/shared";
import { logAudit } from "../audit/log";
import { readDb, writeDb } from "../db";
import { AuthedRequest, requireAuth } from "../middleware/requireAuth";

export const bankRouter = Router();

bankRouter.use(requireAuth);

function toPublicAccount({ userId: _userId, ...account }: Account & { userId: string }): Account {
  return account;
}

function toPublicTransaction({ userId: _userId, ...txn }: Transaction & { userId: string }): Transaction {
  return txn;
}

bankRouter.get("/accounts", (req: AuthedRequest, res) => {
  const db = readDb();
  const accounts = db.accounts.filter((a) => a.userId === req.user!.userId).map(toPublicAccount);
  res.json({ accounts });
});

bankRouter.get("/transactions", (req: AuthedRequest, res) => {
  const { accountId } = req.query;
  const db = readDb();
  const owned = new Set(db.accounts.filter((a) => a.userId === req.user!.userId).map((a) => a.id));

  let transactions = db.transactions.filter((t) => owned.has(t.accountId));
  if (typeof accountId === "string") {
    if (!owned.has(accountId)) {
      return res.status(404).json({ error: "Account not found" });
    }
    transactions = transactions.filter((t) => t.accountId === accountId);
  }
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ transactions: transactions.map(toPublicTransaction) });
});

bankRouter.post("/transfer", (req: AuthedRequest, res) => {
  const { fromAccountId, toAccountId, amount, memo } = req.body as TransferRequest;
  const { userId, username } = req.user!;
  const ip = req.ip ?? "";

  if (!fromAccountId || !toAccountId || typeof amount !== "number" || amount <= 0) {
    logAudit({ action: "transfer", result: "failure", userId, username, ip, reason: "Invalid transfer request" });
    return res.status(400).json({ error: "Invalid transfer request" } satisfies { error: string });
  }
  if (fromAccountId === toAccountId) {
    logAudit({ action: "transfer", result: "failure", userId, username, ip, reason: "Cannot transfer to the same account" });
    return res.status(400).json({ error: "Cannot transfer to the same account" });
  }

  const db = readDb();
  const owned = db.accounts.filter((a) => a.userId === req.user!.userId);
  const from = owned.find((a) => a.id === fromAccountId);
  const to = owned.find((a) => a.id === toAccountId);

  if (!from || !to) {
    logAudit({ action: "transfer", result: "failure", userId, username, ip, reason: "Account not found" });
    return res.status(404).json({ error: "Account not found" } satisfies { error: string });
  }
  if (from.balance < amount) {
    logAudit({ action: "transfer", result: "failure", userId, username, ip, reason: "Insufficient funds" });
    const body: TransferResponse = { success: false, reason: "Insufficient funds" };
    return res.status(200).json(body);
  }

  from.balance = Math.round((from.balance - amount) * 100) / 100;
  to.balance = Math.round((to.balance + amount) * 100) / 100;

  const now = new Date().toISOString();
  db.transactions.push(
    {
      id: `txn_${from.id}_${Date.now()}`,
      userId: req.user!.userId,
      accountId: from.id,
      date: now,
      description: memo ? `Transfer to ${to.name}: ${memo}` : `Transfer to ${to.name}`,
      amount: -amount,
    },
    {
      id: `txn_${to.id}_${Date.now() + 1}`,
      userId: req.user!.userId,
      accountId: to.id,
      date: now,
      description: memo ? `Transfer from ${from.name}: ${memo}` : `Transfer from ${from.name}`,
      amount,
    }
  );

  writeDb(db);

  logAudit({ action: "transfer", result: "success", userId, username, ip });

  const body: TransferResponse = { success: true, accounts: owned.map(toPublicAccount) };
  res.json(body);
});
