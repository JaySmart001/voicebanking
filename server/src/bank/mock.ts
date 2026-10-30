import { v4 as uuid } from "uuid";
import { StoredAccount, StoredTransaction } from "../db";

const SAMPLE_DESCRIPTIONS: Array<[string, number]> = [
  ["Coffee Shop", -4.75],
  ["Grocery Store", -62.18],
  ["Salary Deposit", 2100],
  ["Electric Bill", -88.4],
  ["Streaming Subscription", -13.99],
  ["Restaurant", -34.5],
  ["Gym Membership", -29.99],
  ["Transfer from Savings", 150],
];

export function seedAccountsAndTransactions(
  userId: string
): { accounts: StoredAccount[]; transactions: StoredTransaction[] } {
  const checking: StoredAccount = {
    id: `acct_${uuid()}`,
    userId,
    name: "Everyday Checking",
    type: "checking",
    balance: 4250.75,
    currency: "USD",
  };
  const savings: StoredAccount = {
    id: `acct_${uuid()}`,
    userId,
    name: "High-Yield Savings",
    type: "savings",
    balance: 12300.0,
    currency: "USD",
  };

  const now = Date.now();
  const transactions: StoredTransaction[] = SAMPLE_DESCRIPTIONS.map(([description, amount], i) => ({
    id: `txn_${uuid()}`,
    userId,
    accountId: checking.id,
    date: new Date(now - (SAMPLE_DESCRIPTIONS.length - i) * 86_400_000).toISOString(),
    description,
    amount,
  }));

  return { accounts: [checking, savings], transactions };
}
