import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Account, Transaction } from "@voicebanking/shared";
import type { RootStackParamList } from "../navigation";
import { apiClient } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export default function DashboardScreen({ route, navigation }: Props) {
  const { token, username } = route.params;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    apiClient.setToken(token);
    const { accounts: fetched } = await apiClient.getAccounts();
    setAccounts(fetched);
    if (fetched.length > 0) {
      setSelectedAccountId((current) => current ?? fetched[0].id);
    }
  }, [token]);

  useEffect(() => {
    loadAccounts()
      .catch((err) => Alert.alert("Could not load accounts", String(err)))
      .finally(() => setLoading(false));
  }, [loadAccounts]);

  useEffect(() => {
    if (!selectedAccountId) return;
    apiClient
      .getTransactions(selectedAccountId)
      .then((res) => setTransactions(res.transactions))
      .catch((err) => Alert.alert("Could not load transactions", String(err)));
  }, [selectedAccountId]);

  const submitTransfer = async () => {
    if (!selectedAccountId || !toAccountId || !amount) {
      Alert.alert("Fill in destination account and amount");
      return;
    }
    try {
      const res = await apiClient.transfer({
        fromAccountId: selectedAccountId,
        toAccountId,
        amount: Number(amount),
      });
      if (res.success && res.accounts) {
        setAccounts(res.accounts);
        setAmount("");
        Alert.alert("Transfer complete");
      } else {
        Alert.alert("Transfer failed", res.reason ?? "Unknown error");
      }
    } catch (err) {
      Alert.alert("Transfer error", String(err));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome, {username}</Text>
      {loading && <Text style={styles.status}>Loading accounts...</Text>}

      <FlatList
        horizontal
        data={accounts}
        keyExtractor={(a) => a.id}
        style={styles.accountRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.accountCard,
              item.id === selectedAccountId && styles.accountCardSelected,
            ]}
            onPress={() => setSelectedAccountId(item.id)}
          >
            <Text style={styles.accountName}>{item.name}</Text>
            <Text style={styles.accountBalance}>
              {item.currency} {item.balance.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.sectionTitle}>Transfer</Text>
      <TextInput
        style={styles.input}
        placeholder="To account ID"
        value={toAccountId}
        onChangeText={setToAccountId}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TouchableOpacity style={styles.button} onPress={submitTransfer}>
        <Text style={styles.buttonText}>Send</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <Text style={styles.txDesc}>{item.description}</Text>
            <Text
              style={[
                styles.txAmount,
                { color: item.amount < 0 ? "#f87171" : "#4ade80" },
              ]}
            >
              {item.amount < 0 ? "-" : "+"}
              {Math.abs(item.amount).toFixed(2)}
            </Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.signOut}
        onPress={() => {
          apiClient.setToken(undefined);
          navigation.replace("Login");
        }}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0b1120" },
  title: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 12 },
  status: { color: "#94a3b8", marginBottom: 8 },
  accountRow: { marginBottom: 16, flexGrow: 0 },
  accountCard: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    marginRight: 10,
    minWidth: 140,
  },
  accountCardSelected: { borderWidth: 2, borderColor: "#38bdf8" },
  accountName: { color: "#cbd5e1", marginBottom: 6 },
  accountBalance: { color: "#fff", fontWeight: "700", fontSize: 16 },
  sectionTitle: { color: "#fff", fontWeight: "600", marginTop: 8, marginBottom: 8 },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
  },
  txDesc: { color: "#cbd5e1" },
  txAmount: { fontWeight: "700" },
  signOut: { marginTop: 16, alignItems: "center" },
  signOutText: { color: "#f87171" },
});
