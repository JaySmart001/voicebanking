"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MicRecorder, startTranscription, SpeechTranscriptHandle } from "@/lib/audio";
import { apiClient } from "@/lib/api";
import { useSession } from "@/lib/session";
import { LevelMeter } from "@/components/LevelMeter";
import type { ChallengeResponse } from "@voicebanking/shared";

type Step = "username" | "challenge" | "recording" | "verifying" | "failed";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSession();
  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [level, setLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reason, setReason] = useState<string | null>(null);
  const [score, setScore] = useState<number | undefined>(undefined);
  const recorderRef = useRef<MicRecorder | null>(null);
  const transcriptHandleRef = useRef<SpeechTranscriptHandle | null>(null);

  const getChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const c = await apiClient.getChallenge();
    setChallenge(c);
    setStep("challenge");
  };

  const startRecording = async () => {
    setStep("recording");
    setTranscript("");
    const recorder = new MicRecorder();
    recorderRef.current = recorder;
    setIsRecording(true);
    await recorder.start(setLevel);
    transcriptHandleRef.current = startTranscription(setTranscript);
  };

  const stopAndVerify = async () => {
    const recorder = recorderRef.current;
    if (!recorder || !challenge) return;
    transcriptHandleRef.current?.stop();
    const { base64Pcm16 } = await recorder.stop();
    setIsRecording(false);
    setLevel(0);
    setStep("verifying");

    try {
      const result = await apiClient.verify({
        username: username.trim(),
        challengeId: challenge.challengeId,
        sample: base64Pcm16,
        transcript: transcript || undefined,
      });
      if (result.success && result.token) {
        signIn(result.token, username.trim());
        router.push("/dashboard");
      } else {
        setReason(result.reason ?? "Voice did not match.");
        setScore(result.score);
        setStep("failed");
      }
    } catch (err: any) {
      setReason(err?.message ?? "Verification failed");
      setStep("failed");
    }
  };

  const retry = async () => {
    const c = await apiClient.getChallenge();
    setChallenge(c);
    setReason(null);
    setStep("challenge");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-white/50 hover:text-white/80">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-1">Sign in with your voice</h1>
        <p className="text-white/60 text-sm mb-8">No password - just speak the challenge phrase.</p>

        {step === "username" && (
          <form onSubmit={getChallenge} className="space-y-4">
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
            <button type="submit" className="w-full py-3 rounded-full bg-accent text-ink font-semibold">
              Get challenge phrase
            </button>
          </form>
        )}

        {step === "challenge" && challenge && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-panel border border-white/10 p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Say this phrase</p>
              <p className="text-lg font-medium">&ldquo;{challenge.phrase}&rdquo;</p>
              <p className="text-xs text-white/40 mt-2">A fresh random phrase each time - prevents replaying an old recording.</p>
            </div>
            <button onClick={startRecording} className="w-full py-3 rounded-full bg-accent2 text-ink font-semibold">
              Start recording
            </button>
          </div>
        )}

        {step === "recording" && challenge && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-panel border border-white/10 p-5 text-center">
              <p className="text-lg font-medium">&ldquo;{challenge.phrase}&rdquo;</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <LevelMeter level={level} />
              {transcript && <p className="text-xs text-white/40">heard: &ldquo;{transcript}&rdquo;</p>}
              <button onClick={stopAndVerify} className="px-6 py-3 rounded-full bg-red-400 text-ink font-semibold">
                Stop &amp; verify
              </button>
            </div>
          </div>
        )}

        {step === "verifying" && <p className="text-center text-white/70">Matching your voiceprint…</p>}

        {step === "failed" && (
          <div className="text-center space-y-3">
            <p className="text-red-300">{reason}</p>
            {score !== undefined && <p className="text-xs text-white/40">similarity score: {score.toFixed(3)}</p>}
            <button onClick={retry} className="px-6 py-3 rounded-full border border-white/20">
              Try again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
