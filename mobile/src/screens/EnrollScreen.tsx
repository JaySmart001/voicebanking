import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MIN_ENROLLMENT_SAMPLES } from "@voicebanking/shared";
import type { RootStackParamList } from "../navigation";
import { apiClient } from "../api";
import { VoiceAuthModule } from "../native/VoiceAuthModule";

type Props = NativeStackScreenProps<RootStackParamList, "Enroll">;

const ENROLLMENT_PHRASE = "my voice is my password, verify me";

export default function EnrollScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [samples, setSamples] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const recordSample = async () => {
    try {
      const granted = await VoiceAuthModule.requestPermissions();
      if (!granted) {
        Alert.alert("Microphone permission denied");
        return;
      }
      setIsRecording(true);
      await VoiceAuthModule.startRecording();
    } catch (err) {
      setIsRecording(false);
      Alert.alert("Could not start recording", String(err));
    }
  };

  const finishSample = async () => {
    try {
      const { base64Pcm } = await VoiceAuthModule.stopRecording();
      setSamples((prev) => [...prev, base64Pcm]);
    } catch (err) {
      Alert.alert("Could not stop recording", String(err));
    } finally {
      setIsRecording(false);
    }
  };

  const submitEnrollment = async () => {
    if (!username || !displayName) {
      Alert.alert("Enter a username and display name first");
      return;
    }
    if (samples.length < MIN_ENROLLMENT_SAMPLES) {
      Alert.alert(`Record at least ${MIN_ENROLLMENT_SAMPLES} samples first`);
      return;
    }
    setBusy(true);
    try {
      await apiClient.enroll({ username, displayName, samples });
      Alert.alert("Enrolled", "Voiceprint enrolled. You can now log in.", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
    } catch (err) {
      Alert.alert("Enrollment failed", String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Enroll your voiceprint</Text>
      <Text style={styles.subtitle}>
        Speak the phrase below {MIN_ENROLLMENT_SAMPLES} times. This is a demo
        voiceprint, not bank-grade biometric security - see the repo README.
      </Text>
      <Text style={styles.phrase}>&ldquo;{ENROLLMENT_PHRASE}&rdquo;</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Display name"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Text style={styles.progress}>
        Samples recorded: {samples.length} / {MIN_ENROLLMENT_SAMPLES}
      </Text>

      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonRecording]}
        onPress={isRecording ? finishSample : recordSample}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {isRecording ? "Stop recording" : "Record sample"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.submitButton]}
        onPress={submitEnrollment}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {busy ? "Submitting..." : "Finish enrollment"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.replace("Login")}>
        <Text style={styles.link}>Already enrolled? Log in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0b1120" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 8 },
  subtitle: { color: "#94a3b8", marginBottom: 16, lineHeight: 20 },
  phrase: {
    color: "#38bdf8",
    fontStyle: "italic",
    marginBottom: 20,
    fontSize: 16,
  },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  progress: { color: "#cbd5e1", marginBottom: 12 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonRecording: { backgroundColor: "#dc2626" },
  submitButton: { backgroundColor: "#16a34a" },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { color: "#38bdf8", textAlign: "center", marginTop: 8 },
});
