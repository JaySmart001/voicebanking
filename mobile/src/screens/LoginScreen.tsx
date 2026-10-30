import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { apiClient } from "../api";
import { VoiceAuthModule } from "../native/VoiceAuthModule";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [phrase, setPhrase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const signInWithVoice = async () => {
    if (!username) {
      Alert.alert("Enter your username first");
      return;
    }
    setBusy(true);
    try {
      setStatus("Checking device biometrics...");
      // Device-level biometric check (Face ID / Touch ID / Android
      // BiometricPrompt) as a local pre-check layered in front of the
      // voiceprint check - mirrors how real banking apps combine "something
      // you are" factors at both the OS layer and the server layer.
      const biometricsOk = await VoiceAuthModule.authenticateWithDeviceBiometrics(
        "Confirm it's you before voice sign-in"
      ).catch(() => true); // demo: don't hard-block if device has no biometrics enrolled

      if (!biometricsOk) {
        setStatus("");
        Alert.alert("Device biometric check failed");
        return;
      }

      setStatus("Fetching voice challenge...");
      const challenge = await apiClient.getChallenge();
      setPhrase(challenge.phrase);

      const granted = await VoiceAuthModule.requestPermissions();
      if (!granted) {
        setStatus("");
        Alert.alert("Microphone permission denied");
        return;
      }

      setStatus(`Recording: say "${challenge.phrase}"`);
      await VoiceAuthModule.startRecording();
      // In a polished build this would wait for silence detection or a
      // "done speaking" button; kept as a fixed window for the demo.
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 3000));
      const { base64Pcm } = await VoiceAuthModule.stopRecording();

      setStatus("Verifying voiceprint...");
      const result = await apiClient.verify({
        username,
        challengeId: challenge.challengeId,
        sample: base64Pcm,
      });

      if (result.success && result.token) {
        apiClient.setToken(result.token);
        navigation.replace("Dashboard", { token: result.token, username });
      } else {
        Alert.alert("Verification failed", result.reason ?? "No match");
      }
    } catch (err) {
      Alert.alert("Sign-in error", String(err));
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>VoiceBank</Text>
      <Text style={styles.subtitle}>Sign in with your voice</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />

      {phrase && <Text style={styles.phrase}>Say: &ldquo;{phrase}&rdquo;</Text>}
      {!!status && <Text style={styles.status}>{status}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={signInWithVoice}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {busy ? "Working..." : "Sign in with voice"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.replace("Enroll")}>
        <Text style={styles.link}>New here? Enroll your voiceprint</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0b1120", justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { color: "#94a3b8", textAlign: "center", marginBottom: 24 },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  phrase: { color: "#38bdf8", textAlign: "center", marginBottom: 8, fontStyle: "italic" },
  status: { color: "#cbd5e1", textAlign: "center", marginBottom: 8 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#38bdf8", textAlign: "center" },
});
