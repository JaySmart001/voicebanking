"use client";

export function LevelMeter({ level }: { level: number }) {
  const bars = 20;
  const active = Math.round(level * bars);
  return (
    <div className="flex items-end gap-0.5 h-10" aria-label="microphone level">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm transition-all duration-75"
          style={{
            height: `${8 + (i / bars) * 32}px`,
            background: i < active ? (i < bars * 0.7 ? "#6ee7c3" : "#f5a65b") : "#1d2436",
          }}
        />
      ))}
    </div>
  );
}
