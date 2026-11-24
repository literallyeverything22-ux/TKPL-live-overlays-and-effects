import { useEffect, useState } from "react";

export function TeamCrest({
  logo,
  name,
  shortName,
  color = "#E5B85C",
  size = 44,
  className = "",
}: {
  logo?: string;
  name: string;
  shortName?: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [logo]);

  if (!logo || failed) {
    const label =
      shortName ||
      name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold tracking-wider text-white ${className}`}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 30% 30%, ${color}, #0C1729)`,
          border: `2px solid ${color}`,
          fontSize: Math.max(11, Math.round(size * 0.34)),
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
        boxShadow: `0 0 18px ${color}40`,
      }}
    />
  );
}

export function PlayerAvatar({
  photo,
  name,
  accentColor = "#E5B85C",
  size = 56,
  className = "",
}: {
  photo?: string;
  name: string;
  accentColor?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);

  if (!photo || failed) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("");
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-display font-extrabold text-white ${className}`}
        style={{
          width: size,
          height: size,
          background: `linear-gradient(145deg, ${accentColor}55, #0B1629)`,
          border: `1.5px solid ${accentColor}88`,
          fontSize: Math.max(13, Math.round(size * 0.36)),
        }}
      >
        {initials || "TK"}
      </div>
    );
  }

  return (
    <img
      src={photo}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-2xl object-cover object-top ${className}`}
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${accentColor}99`,
      }}
    />
  );
}

export function RedTennisBallIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="tkplBallGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FF5F6D" />
          <stop offset="55%" stopColor="#D91E2D" />
          <stop offset="100%" stopColor="#7C0B15" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#tkplBallGrad)" />
      <path
        d="M12 15C22 24 22 40 12 49"
        stroke="#FFF6E8"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M52 15C42 24 42 40 52 49"
        stroke="#FFF6E8"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="29" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
    </svg>
  );
}
