import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-ink via-[#0d1222] to-ink">
      <nav className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="font-semibold tracking-tight text-lg">
          Voice<span className="text-accent">Bank</span>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/login" className="px-4 py-2 rounded-full border border-white/15 hover:border-white/30 transition">
            Sign in
          </Link>
          <Link href="/enroll" className="px-4 py-2 rounded-full bg-accent text-ink font-medium hover:brightness-95 transition">
            Enroll
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <p className="inline-block text-xs uppercase tracking-widest text-accent2 bg-accent2/10 border border-accent2/30 rounded-full px-3 py-1 mb-6">
          Portfolio demo · voice biometrics
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Your voice is the password.
        </h1>
        <p className="mt-5 text-lg text-white/70 max-w-2xl mx-auto">
          VoiceBank is a cross-platform concept for mobile banking authentication: speak a
          passphrase, get matched against your enrolled voiceprint, and sign in - no typed
          password at all. Same backend contract powers the web app, a React Native mobile
          app with native Kotlin/Swift voice capture, and a wearable companion for approving
          sign-ins from a smartwatch.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/enroll" className="px-6 py-3 rounded-full bg-accent text-ink font-semibold hover:brightness-95 transition">
            Enroll your voice
          </Link>
          <Link href="/login" className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 transition">
            Try voice sign-in
          </Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-10 grid sm:grid-cols-3 gap-4">
        {[
          {
            title: "Speak to enroll",
            body: "Repeat a short passphrase three times. The server derives an MFCC-based voiceprint embedding from your audio.",
          },
          {
            title: "Speak to verify",
            body: "At sign-in you get a fresh random challenge phrase. You speak it; voiceprint similarity + spoken content must both match.",
          },
          {
            title: "Built to extend",
            body: "Same API contract for web, mobile (native Kotlin/Swift capture), and a Wear OS / watchOS approval companion.",
          },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl bg-panel border border-white/10 p-5">
            <h3 className="font-semibold mb-2">{card.title}</h3>
            <p className="text-sm text-white/60">{card.body}</p>
          </div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5 text-sm text-amber-200/90">
          <p className="font-semibold mb-1">This is a demo / portfolio project, not a real bank.</p>
          <p className="text-amber-200/70">
            The voiceprint matching here uses a hand-rolled MFCC + cosine-similarity comparison
            for educational and demonstration purposes. It is intentionally simple so the full
            pipeline (capture → feature extraction → matching → session issuance) is easy to
            read end-to-end across web, mobile, and wearable. Production-grade voice biometrics
            require trained neural speaker-embedding models, anti-spoofing / liveness detection,
            and a licensed vendor or in-house ML team - see{" "}
            <code className="text-amber-100">docs/SECURITY.md</code> in the repo for details.
            All account balances and transactions are fake and stored locally.
          </p>
        </div>
        <div className="mt-4 text-center">
          <Link href="/watch-preview" className="text-sm text-accent2 hover:underline">
            Preview the smartwatch approval UI →
          </Link>
        </div>
      </section>
    </main>
  );
}
