"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MicRecorder } from "@/lib/audio";
import { apiClient } from "@/lib/api";
import { LevelMeter } from "@/components/LevelMeter";
import { MIN_ENROLLMENT_SAMPLES, MIN_SAMPLE_DURATION_MS } from "@voicebanking/shared";

const PASSPHRASE = "My voice is my password, verify me";

type Step = "details" | "record" | "submitting" | "done" | "error";

export default function EnrollPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [samples, setSamples] = useState<string[]>([]);
  const [level, setLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MicRecorder | null>(null);

  const startDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) return;
    setStep("record");
  };

  const record = async () => {
    setError(null);
    const recorder = new MicRecorder();
    recorderRef.current = recorder;
    try {
      setIsRecording(true);
      await recorder.start(setLevel);
    } catch (err) {
      setError("Microphone access was denied or unavailable.");
      setIsRecording(false);
    }
  };

  const stopAndKeep = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    try {
      const { base64Pcm16, durationMs } = await recorder.stop();
      if (durationMs < MIN_SAMPLE_DURATION_MS) {
        setError("That was a bit short - try speaking the full phrase clearly.");
      } else {
        setSamples((prev) => [...prev, base64Pcm16]);
      }
    } catch {
      setError("Could not process that recording, please try again.");
    } finally {
      setIsRecording(false);
      setLevel(0);
    }
  };

  const submit = async () => {
    setStep("submitting");
    setError(null);
    try {
      await apiClient.enroll({ username: username.trim(), displayName: displayName.trim(), samples });
      setStep("done");
    } catch (err: any) {
      setError(err?.message ?? "Enrollment failed");
      setStep("error");
    }
  };

  const remaining = MIN_ENROLLMENT_SAMPLES - samples.length;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-white/50 hover:text-white/80">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-1">Enroll your voice</h1>
        <p className="text-white/60 text-sm mb-8">
          We&apos;ll build a voiceprint from a short phrase, repeated {MIN_ENROLLMENT_SAMPLES} times.
        </p>

        {step === "details" && (
          <form onSubmit={startDetails} className="space-y-4">
            <div>
              <label className="text-sm text-white/70">Username</label>
              <input
                className="mt-1 w-full rounded-lg bg-panel border border-white/10 px-3 py-2 outline-none focus:border-accent2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ada"
                required
              />
            </div>
            <div>
              <label className="text-sm text-white/70">Display name</label>
              <input
                className="mt-1 w-full rounded-lg bg-panel border border-white/10 px-3 py-2 outline-none focus:border-accent2"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Ada Lovelace"
                required
              />
            </div>
            <button type="submit" className="w-full py-3 rounded-full bg-accent text-ink font-semibold">
              Continue
            </button>
          </form>
        )}

        {step === "record" && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-panel border border-white/10 p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Say this phrase</p>
              <p className="text-lg font-medium">&ldquo;{PASSPHRASE}&rdquo;</p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <LevelMeter level={level} />
              <p className="text-sm text-white/60">
                Sample {Math.min(samples.length + 1, MIN_ENROLLMENT_SAMPLES)} of {MIN_ENROLLMENT_SAMPLES}
                {" · "}
                {remaining > 0 ? `${remaining} more to go` : "all set"}
              </p>
              {!isRecording ? (
                <button
                  onClick={record}
                  disabled={samples.length >= MIN_ENROLLMENT_SAMPLES}
                  className="px-6 py-3 rounded-full bg-accent2 text-ink font-semibold disabled:opacity-40"
                >
                  {samples.length === 0 ? "Start recording" : "Record next sample"}
                </button>
              ) : (
                <button onClick={stopAndKeep} className="px-6 py-3 rounded-full bg-red-400 text-ink font-semibold">
                  Stop
                </button>
              )}
            </div>

            {error && <p className="text-sm text-red-300 text-center">{error}</p>}

            {samples.length >= MIN_ENROLLMENT_SAMPLES && (
              <button onClick={submit} className="w-full py-3 rounded-full bg-accent text-ink font-semibold">
                Finish enrollment
              </button>
            )}
          </div>
        )}

        {step === "submitting" && <p className="text-center text-white/70">Building your voiceprint…</p>}

        {step === "done" && (
          <div className="text-center space-y-4">
            <p className="text-accent font-semibold">Enrollment complete.</p>
            <button onClick={() => router.push("/login")} className="px-6 py-3 rounded-full bg-accent text-ink font-semibold">
              Try signing in
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center space-y-4">
            <p className="text-red-300">{error}</p>
            <button onClick={() => setStep("record")} className="px-6 py-3 rounded-full border border-white/20">
              Back to recording
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
