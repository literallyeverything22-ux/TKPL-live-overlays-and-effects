import { useEffect, useRef } from "react";
import type { ReplaySystemState } from "@/modules/core/types";
import { playThirdUmpireSfx } from "@/modules/core/sound-fx";

interface ThirdUmpireOverlayProps {
  thirdUmpire: ReplaySystemState["thirdUmpire"];
  soundEnabled: boolean;
}

export function ThirdUmpireOverlay({
  thirdUmpire,
  soundEnabled,
}: ThirdUmpireOverlayProps) {
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (
      soundEnabled &&
      thirdUmpire.status !== "idle" &&
      thirdUmpire.updatedAt &&
      lastPlayedRef.current !== thirdUmpire.updatedAt
    ) {
      lastPlayedRef.current = thirdUmpire.updatedAt;
      playThirdUmpireSfx(thirdUmpire.status);
    }
  }, [thirdUmpire, soundEnabled]);

  if (!thirdUmpire || thirdUmpire.status === "idle") return null;

  if (thirdUmpire.status === "pending") {
    return (
      <div className="anim-slide-down pointer-events-none absolute top-9 left-1/2 z-40 -translate-x-1/2">
        <div className="rounded-3xl bg-gradient-to-r from-[#E5B85C] via-amber-300 to-[#E03340] p-[3px] shadow-[0_20px_70px_rgba(245,158,11,0.55)]">
          <div className="flex items-center gap-5 rounded-[21px] bg-[#081224]/96 px-10 py-4">
            <span className="anim-pulse-dot h-4 w-4 rounded-full bg-amber-400 shadow-[0_0_20px_#FBBF24]" />
            <div className="text-center">
              <div className="font-hud text-xs font-extrabold tracking-[0.34em] text-[#F7D58B] uppercase">
                TKPL TV UMPIRE REVIEW
              </div>
              <div className="font-display text-5xl leading-none font-extrabold tracking-widest text-white">
                DECISION PENDING
              </div>
            </div>
            <span className="anim-pulse-dot h-4 w-4 rounded-full bg-amber-400 shadow-[0_0_20px_#FBBF24]" />
          </div>
        </div>
      </div>
    );
  }

  const isOut = thirdUmpire.status === "out";

  return (
    <div
      key={`3u-${thirdUmpire.status}-${thirdUmpire.updatedAt}`}
      className="anim-pop-in pointer-events-none absolute top-[140px] left-1/2 z-40 -translate-x-1/2"
    >
      <div
        className={`rounded-[34px] p-[4px] ${
          isOut
            ? "bg-gradient-to-r from-red-500 via-rose-300 to-red-600 shadow-[0_0_120px_rgba(239,68,68,0.85)]"
            : "bg-gradient-to-r from-emerald-400 via-green-200 to-emerald-500 shadow-[0_0_120px_rgba(34,197,94,0.85)]"
        }`}
      >
        <div
          className={`min-w-[660px] rounded-[30px] px-14 py-9 text-center ${
            isOut
              ? "bg-gradient-to-b from-[#99111D] to-[#42060B]"
              : "bg-gradient-to-b from-[#0E7A3E] to-[#05351A]"
          }`}
        >
          <div className="font-hud text-sm font-extrabold tracking-[0.36em] text-white/85 uppercase">
            THIRD UMPIRE OFFICIAL DECISION
          </div>
          <div className="font-display mt-2 text-[120px] leading-[0.85] font-extrabold tracking-wider text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            {isOut ? "OUT" : "NOT OUT"}
          </div>
          {thirdUmpire.note && (
            <div className="font-hud mt-3 text-lg font-bold tracking-[0.2em] text-white/90 uppercase">
              {thirdUmpire.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
