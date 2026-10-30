import Link from "next/link";

export default function WatchPreviewPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-8">
      <Link href="/" className="text-sm text-white/50 hover:text-white/80 self-start">
        ← Back
      </Link>

      <div
        className="rounded-full border-8 border-[#1d2436] bg-black w-72 h-72 flex items-center justify-center shadow-2xl"
        style={{ boxShadow: "0 0 0 4px #0b0f1a, 0 20px 50px rgba(0,0,0,0.6)" }}
      >
        <div className="rounded-full w-64 h-64 bg-gradient-to-b from-[#0d1222] to-black flex flex-col items-center justify-center text-center px-6">
          <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent flex items-center justify-center mb-3">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
          </div>
          <p className="text-xs text-white/50 mb-1">VoiceBank</p>
          <p className="font-semibold text-sm">Approve sign-in?</p>
          <p className="text-[11px] text-white/50 mt-1">Voice match 94% · New device</p>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 rounded-full bg-white/10 text-[11px]">Deny</button>
            <button className="px-3 py-1.5 rounded-full bg-accent text-ink text-[11px] font-semibold">Approve</button>
          </div>
        </div>
      </div>

      <div className="max-w-md text-center text-sm text-white/60">
        <p className="mb-2">
          This is a static visual preview, not a working watch app. It illustrates the intended
          flow for the wearable companion: the phone performs the voiceprint match, then pushes
          an approval prompt to a paired Wear OS or watchOS device over the platform&apos;s
          device-to-watch data channel.
        </p>
        <p className="text-white/40">
          See <code className="text-white/60">/wearable</code> in the repository for the Wear OS
          (Kotlin) and watchOS (Swift) companion project stubs and the architecture notes on
          implementing this for real.
        </p>
      </div>
    </main>
  );
}
