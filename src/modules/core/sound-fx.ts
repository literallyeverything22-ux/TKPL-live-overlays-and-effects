import type { BroadcastEffectType } from "@/modules/core/types";

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
  endFreq?: number,
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playNoiseBurst(
  ctx: AudioContext,
  startOffset: number,
  duration: number,
  filterFreq: number,
  gainPeak: number,
) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.45));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  const now = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(gainPeak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
}

export function playBroadcastSfx(type: BroadcastEffectType) {
  try {
    const ctx = getCtx();
    if (!ctx) return;

    switch (type) {
      case "four": {
        // Crisp bat crack + energetic rising sports sting
        playNoiseBurst(ctx, 0, 0.09, 1800, 0.22);
        playTone(ctx, 523.25, 0.04, 0.16, "triangle", 0.14);
        playTone(ctx, 659.25, 0.14, 0.18, "triangle", 0.16);
        playTone(ctx, 783.99, 0.24, 0.34, "sawtooth", 0.09);
        break;
      }
      case "six": {
        // Heavy bat sweet-spot boom + rising stadium siren + crowd whoosh
        playNoiseBurst(ctx, 0, 0.12, 1200, 0.28);
        playTone(ctx, 130, 0, 0.28, "sine", 0.26, 65);
        playTone(ctx, 440, 0.08, 0.35, "sawtooth", 0.11, 880);
        playTone(ctx, 587.33, 0.28, 0.22, "triangle", 0.16);
        playTone(ctx, 880, 0.42, 0.55, "sawtooth", 0.12);
        playNoiseBurst(ctx, 0.18, 0.85, 900, 0.12);
        break;
      }
      case "wicket": {
        // Dramatic timber shatter + deep cinematic sub-drop
        playNoiseBurst(ctx, 0, 0.16, 2400, 0.3);
        playTone(ctx, 185, 0.02, 0.55, "sawtooth", 0.18, 48);
        playTone(ctx, 110, 0.05, 0.65, "sine", 0.28, 36);
        playTone(ctx, 311.13, 0.22, 0.32, "triangle", 0.12, 233.08);
        break;
      }
      case "free-hit": {
        playTone(ctx, 880, 0, 0.12, "sine", 0.14);
        playTone(ctx, 1174.66, 0.14, 0.2, "sine", 0.16);
        break;
      }
      case "milestone":
      case "hat-trick":
      case "match-win": {
        // Championship fanfare triad
        playTone(ctx, 523.25, 0, 0.18, "triangle", 0.16);
        playTone(ctx, 659.25, 0.12, 0.18, "triangle", 0.16);
        playTone(ctx, 783.99, 0.24, 0.22, "triangle", 0.17);
        playTone(ctx, 1046.5, 0.38, 0.6, "sawtooth", 0.11);
        playNoiseBurst(ctx, 0.25, 0.7, 1100, 0.1);
        break;
      }
      default: {
        playTone(ctx, 660, 0, 0.18, "triangle", 0.12);
        break;
      }
    }
  } catch {
    // Ignore autoplay restriction silently when audio isn't unlocked
  }
}

export function playStingerWhooshSfx() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    playNoiseBurst(ctx, 0, 0.42, 1150, 0.22);
    playTone(ctx, 220, 0.02, 0.34, "sawtooth", 0.09, 680);
    playTone(ctx, 680, 0.26, 0.32, "triangle", 0.12, 330);
  } catch {
    // ignore
  }
}

export function playThirdUmpireSfx(status: "pending" | "out" | "not-out") {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (status === "pending") {
      playTone(ctx, 440, 0, 0.14, "sine", 0.14);
      playTone(ctx, 440, 0.22, 0.14, "sine", 0.14);
    } else if (status === "out") {
      playTone(ctx, 160, 0, 0.55, "sawtooth", 0.2, 55);
      playNoiseBurst(ctx, 0, 0.18, 1800, 0.22);
    } else {
      playTone(ctx, 523.25, 0, 0.16, "triangle", 0.15);
      playTone(ctx, 783.99, 0.14, 0.36, "triangle", 0.17);
    }
  } catch {
    // ignore
  }
}
