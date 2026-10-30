"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { apiClient } from "@/lib/api";
import type { Account, Transaction } from "@voicebanking/shared";

export default function DashboardPage() {
  const router = useRouter();
  const { token, username, signOut } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    const res = await apiClient.getAccounts();
    setAccounts(res.accounts);
    if (!selected && res.accounts.length > 0) setSelected(res.accounts[0].id);
  }, [selected]);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    loadAccounts().finally(() => setLoading(false));
  }, [token, router, loadAccounts]);

  useEffect(() => {
    if (!selected) return;
    apiClient.getTransactions(selected).then((res) => setTransactions(res.transactions));
  }, [selected]);

  const doTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const other = accounts.find((a) => a.id !== selected);
    if (!selected || !other) return;
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }
    try {
      const res = await apiClient.transfer({ fromAccountId: selected, toAccountId: other.id, amount: value, memo });
      if (res.success && res.accounts) {
        setAccounts(res.accounts);
        const refreshed = await apiClient.getTransactions(selected);
        setTransactions(refreshed.transactions);
        setAmount("");
        setMemo("");
        setMessage("Transfer complete.");
      } else {
        setMessage(res.reason ?? "Transfer failed.");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Transfer failed.");
    }
  };

  if (loading) return <main className="min-h-screen flex items-center justify-center text-white/60">Loading…</main>;

  const selectedAccount = accounts.find((a) => a.id === selected);
  const otherAccount = accounts.find((a) => a.id !== selected);

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/50 text-sm">Signed in as</p>
          <p className="font-semibold">{username}</p>
        </div>
        <button
          onClick={() => {
            signOut();
            router.push("/");
          }}
          className="px-4 py-2 rounded-full border border-white/15 text-sm hover:border-white/30"
        >
          Sign out
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {accounts.map((acc) => (
          <button
            key={acc.id}
            onClick={() => setSelected(acc.id)}
            className={`text-left rounded-2xl border p-5 transition ${
              selected === acc.id ? "border-accent bg-accent/10" : "border-white/10 bg-panel"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-white/50">{acc.type}</p>
            <p className="font-semibold">{acc.name}</p>
            <p className="text-2xl font-bold mt-2">
              {acc.balance.toLocaleString(undefined, { style: "currency", currency: acc.currency })}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-panel p-5 mb-8">
        <h2 className="font-semibold mb-4">
          Transfer {selectedAccount?.name} → {otherAccount?.name}
        </h2>
        <form onSubmit={doTransfer} className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 rounded-lg bg-ink border border-white/10 px-3 py-2 outline-none focus:border-accent2"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <input
            className="flex-1 rounded-lg bg-ink border border-white/10 px-3 py-2 outline-none focus:border-accent2"
            placeholder="Memo (optional)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          <button type="submit" className="px-6 py-2 rounded-full bg-accent text-ink font-semibold whitespace-nowrap">
            Transfer
          </button>
        </form>
        {message && <p className="text-sm text-white/60 mt-3">{message}</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="font-semibold mb-4">Transactions - {selectedAccount?.name}</h2>
        <ul className="divide-y divide-white/10">
          {transactions.map((tx) => (
            <li key={tx.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <p>{tx.description}</p>
                <p className="text-white/40 text-xs">{new Date(tx.date).toLocaleString()}</p>
              </div>
              <p className={tx.amount < 0 ? "text-red-300" : "text-accent"}>
                {tx.amount < 0 ? "-" : "+"}
                {Math.abs(tx.amount).toLocaleString(undefined, { style: "currency", currency: selectedAccount?.currency ?? "USD" })}
              </p>
            </li>
          ))}
          {transactions.length === 0 && <p className="text-white/40 text-sm py-3">No transactions yet.</p>}
        </ul>
      </div>
    </main>
  );
}
