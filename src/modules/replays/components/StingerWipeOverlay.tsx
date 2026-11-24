import { useEffect, useRef, useState } from "react";
import type { StingerTrigger } from "@/modules/core/types";
import { playStingerWhooshSfx } from "@/modules/core/sound-fx";
import { RedTennisBallIcon } from "@/modules/core/components/BrandMedia";

interface StingerWipeOverlayProps {
  stinger: StingerTrigger | null;
  soundEnabled: boolean;
}

export function StingerWipeOverlay({
  stinger,
  soundEnabled,
}: StingerWipeOverlayProps) {
  const [active, setActive] = useState<StingerTrigger | null>(null);
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (!stinger) return;
    const age = Date.now() - stinger.triggeredAt;
    if (age > 950) return;

    setActive(stinger);
    if (soundEnabled && lastPlayedRef.current !== stinger.id) {
      lastPlayedRef.current = stinger.id;
      playStingerWhooshSfx();
    }

    const timer = window.setTimeout(() => {
      setActive((curr) => (curr?.id === stinger.id ? null : curr));
    }, 920);
    return () => window.clearTimeout(timer);
  }, [stinger, soundEnabled]);

  if (!active) return null;

  return (
    <div
      key={`stinger-${active.id}`}
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {/* Leading Red Guru Lazer Blade */}
      <div
        className="anim-stinger-blade-a absolute -inset-y-24 -left-40 w-[2350px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #E03340 12%, #E5B85C 24%, #081224 32%, #0B1931 68%, #E5B85C 78%, #E03340 90%, transparent 100%)",
          boxShadow: "0 0 80px rgba(224,51,64,0.65)",
        }}
      />

      {/* Trailing Gold Accent Accent Blade */}
      <div
        className="anim-stinger-blade-b absolute -inset-y-24 -left-40 w-[2200px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(247,213,139,0.22) 18%, rgba(7,15,29,0.96) 36%, rgba(7,15,29,0.96) 64%, rgba(247,213,139,0.28) 82%, transparent 100%)",
        }}
      />

      {/* Center TKPL Official Crest + Red Ball Impact */}
      <div className="anim-stinger-crest absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-7 rounded-[32px] border-2 border-[#F7D58B]/65 bg-[#081224]/95 px-12 py-8 shadow-[0_32px_100px_rgba(0,0,0,0.85)]">
          <img
            src="/media/tkpl/brand/tkpl-official-logo-dark.png"
            alt="TKPL 2026"
            className="h-28 w-auto object-contain drop-shadow-[0_6px_24px_rgba(229,184,92,0.5)]"
          />
          <div className="h-24 w-[2px] bg-gradient-to-b from-transparent via-[#F7D58B] to-transparent" />
          <div>
            <div className="flex items-center gap-3">
              <RedTennisBallIcon size={40} />
              <span className="font-hud text-lg font-extrabold tracking-[0.34em] text-[#F7D58B] uppercase">
                TKPL 2026 BROADCAST
              </span>
            </div>
            <div className="font-display mt-1 text-7xl leading-none font-extrabold tracking-wider text-white uppercase">
              {active.label || "INSTANT REPLAY"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
