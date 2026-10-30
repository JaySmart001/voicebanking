"use client";

import { AUDIO_SAMPLE_RATE, float32ToInt16, int16ArrayToBase64 } from "@voicebanking/shared";

export interface RecordedSample {
  base64Pcm16: string;
  durationMs: number;
}

/**
 * Records from the mic via MediaRecorder (for simple start/stop + live level
 * metering), then decodes the resulting blob and resamples it to the
 * contract's 16kHz mono PCM16 format using an OfflineAudioContext. This
 * keeps the capture UX simple while guaranteeing the bytes we send match
 * what the server-side voiceprint engine expects, regardless of whatever
 * native sample rate the mic/browser used while recording.
 */
export class MicRecorder {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private analyser: AnalyserNode | null = null;
  private levelAudioCtx: AudioContext | null = null;
  private levelRaf: number | null = null;

  async start(onLevel?: (level: number) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : undefined;
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();

    if (onLevel) {
      this.levelAudioCtx = new AudioContext();
      const source = this.levelAudioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.levelAudioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      const tick = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        onLevel(Math.min(1, rms * 4));
        this.levelRaf = requestAnimationFrame(tick);
      };
      this.levelRaf = requestAnimationFrame(tick);
    }
  }

  async stop(): Promise<RecordedSample> {
    if (!this.mediaRecorder || !this.stream) {
      throw new Error("Recorder was not started");
    }

    const recorder = this.mediaRecorder;
    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.stop();
    });

    this.cleanup();

    const arrayBuffer = await blob.arrayBuffer();
    const decodeCtx = new AudioContext();
    const decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
    const durationMs = decoded.duration * 1000;

    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * AUDIO_SAMPLE_RATE), AUDIO_SAMPLE_RATE);
    const bufferSource = offline.createBufferSource();
    bufferSource.buffer = decoded;
    bufferSource.connect(offline.destination);
    bufferSource.start();
    const rendered = await offline.startRendering();
    await decodeCtx.close();

    const float32 = rendered.getChannelData(0);
    const int16 = float32ToInt16(float32);
    const base64Pcm16 = int16ArrayToBase64(int16);

    return { base64Pcm16, durationMs };
  }

  cancel(): void {
    try {
      this.mediaRecorder?.stop();
    } catch {
      // already stopped
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.levelRaf !== null) cancelAnimationFrame(this.levelRaf);
    this.levelRaf = null;
    this.analyser = null;
    this.levelAudioCtx?.close().catch(() => {});
    this.levelAudioCtx = null;
  }
}

export interface SpeechTranscriptHandle {
  stop: () => void;
}

/** Best-effort transcript via the browser's SpeechRecognition API, used only
 *  as a second factor alongside the voiceprint match. Not supported in all
 *  browsers (notably Firefox) - callers must treat transcript as optional. */
export function startTranscription(
  onResult: (transcript: string) => void
): SpeechTranscriptHandle | null {
  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;

  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  let finalTranscript = "";
  recognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + " ";
        onResult(finalTranscript.trim());
      }
    }
  };
  recognition.onerror = () => {};
  recognition.start();

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}
