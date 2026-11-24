/**
 * TKPL 2026 Live Match Broadcast & Scorer Server
 * Zero-dependency Node.js HTTP + SSE server with atomic JSON persistence
 * and built-in OBS Studio WebSocket v5 Instant Replay controller.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { ObsBridge } from "./obs-bridge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(PROJECT_ROOT, "dist");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const TEAMS_SEED_PATH = path.join(DATA_DIR, "tkpl-2026-teams.json");
const STATE_PATH = path.join(DATA_DIR, "tournament-state.json");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");

const PORT = Number(process.env.PORT || 4280);
const HOST = process.env.HOST || "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function defaultReplayState() {
  return {
    mode: "idle", // "idle" | "playing" | "paused"
    activeClipId: null,
    speedPercent: 50,
    isSimulatedPreview: false,
    stinger: null, // { id, direction: "in" | "out" | "manual", label, triggeredAt }
    thirdUmpire: {
      status: "idle", // "idle" | "pending" | "out" | "not-out"
      note: "",
      updatedAt: 0,
    },
    clips: [],
  };
}

function createInitialState() {
  let seed = {
    tournamentName: "TKPL 2026",
    tournamentSubtitle:
      "TENNIS GURU LAZER RED HARD TENNIS BALL KADAPA PREMIER LEAGUE",
    website: "TKPL.CO.IN",
    defaultOvers: 10,
    teams: [],
  };
  if (fs.existsSync(TEAMS_SEED_PATH)) {
    seed = JSON.parse(fs.readFileSync(TEAMS_SEED_PATH, "utf8"));
  }

  return {
    version: 2,
    revision: 1,
    updatedAt: new Date().toISOString(),
    tournamentName: seed.tournamentName || "TKPL 2026",
    tournamentSubtitle:
      seed.tournamentSubtitle ||
      "TENNIS GURU LAZER RED HARD TENNIS BALL KADAPA PREMIER LEAGUE",
    website: seed.website || "TKPL.CO.IN",
    venueDefault: "Kadapa Stadium Ground",
    teams: seed.teams || [],
    matches: [],
    activeMatchId: null,
    overlay: {
      showScorebar: true,
      showCornerBug: true,
      showSponsorTicker: true,
      showWinPredictor: true,
      showTournamentSixesCounter: true,
      soundEnabled: false,
      activeCard: "none",
      sponsorMessages: [
        "OFFICIAL BALL PARTNER · GURU LAZER RED HARD TENNIS BALL",
        "ORGANIZED BY SULTAN SPORTS (KADAPA) & NR SPORTS (VEMPALLI)",
        "CHAMPIONS PRIZE ₹2,00,000 + CUP · RUNNER-UP ₹1,50,000",
        "FOLLOW LIVE SCORES, TEAMS & UPDATES AT TKPL.CO.IN",
      ],
      activeEffect: null,
    },
    replays: defaultReplayState(),
  };
}

function loadState() {
  ensureDir(DATA_DIR);
  if (fs.existsSync(STATE_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
      if (parsed && Array.isArray(parsed.teams) && parsed.teams.length > 0) {
        if (!parsed.replays) {
          parsed.replays = defaultReplayState();
        }
        return parsed;
      }
    } catch (err) {
      console.warn(
        "[WARN] Could not read existing tournament-state.json, re-initializing:",
        err.message,
      );
    }
  }
  const initial = createInitialState();
  writeStateAtomic(initial);
  return initial;
}

function writeStateAtomic(state) {
  ensureDir(DATA_DIR);
  const tmpPath = `${STATE_PATH}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmpPath, STATE_PATH);
}

let currentState = loadState();
const sseClients = new Set();
const obsBridge = new ObsBridge();

function commitState(updater) {
  currentState = {
    ...updater(currentState),
    revision: (currentState.revision || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  writeStateAtomic(currentState);
  broadcastToClients();
  return currentState;
}

function broadcastToClients() {
  const payload = `data: ${JSON.stringify(currentState)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

// Auto-build descriptive tag for a newly saved replay clip from the active live match!
function deriveLatestBallReplayMeta(state, customLabel) {
  const match =
    state.matches.find((m) => m.id === state.activeMatchId) ||
    state.matches[state.matches.length - 1];
  const fallback = {
    title: customLabel || "INSTANT REPLAY",
    subtitle: "TKPL 2026 HIGHLIGHT",
    badge: "REPLAY",
    eventType: "highlight",
    overLabel: "",
    playerId: undefined,
    teamId: undefined,
    meters: undefined,
    matchNumber: match?.matchNumber || 1,
  };
  if (!match) return fallback;

  const inn = match.innings[match.currentInningsIndex];
  const lastBall = inn?.balls?.[inn.balls.length - 1];
  if (!inn || !lastBall) return fallback;

  const findPlayer = (pid) => {
    for (const t of state.teams) {
      const p = t.players.find((x) => x.id === pid);
      if (p) return { player: p, team: t };
    }
    return null;
  };

  const batter = findPlayer(lastBall.strikerId);
  const overLabel = `OV ${lastBall.overNumber}.${lastBall.ballInOver || 6}`;

  if (lastBall.wicket) {
    const outP = findPlayer(lastBall.wicket.outPlayerId) || batter;
    return {
      title: customLabel || `WICKET · ${lastBall.wicket.dismissalType.toUpperCase()}!`,
      subtitle: `${outP?.player.name || "Batter"} (${overLabel})`,
      badge: "WICKET REPLAY",
      eventType: "wicket",
      overLabel,
      playerId: outP?.player.id,
      teamId: inn.battingTeamId,
      meters: undefined,
      matchNumber: match.matchNumber,
    };
  }
  if (lastBall.isBoundarySix) {
    return {
      title: customLabel || `${lastBall.sixDistanceMeters || 82}m MASSIVE SIX!`,
      subtitle: `${batter?.player.name || "Batter"} · ${lastBall.sixZoneLabel || "OVER THE ROPE"} (${overLabel})`,
      badge: "SIX REPLAY",
      eventType: "six",
      overLabel,
      playerId: batter?.player.id,
      teamId: inn.battingTeamId,
      meters: lastBall.sixDistanceMeters,
      matchNumber: match.matchNumber,
    };
  }
  if (lastBall.isBoundaryFour) {
    return {
      title: customLabel || "CRACKING FOUR!",
      subtitle: `${batter?.player.name || "Batter"} (${overLabel})`,
      badge: "FOUR REPLAY",
      eventType: "four",
      overLabel,
      playerId: batter?.player.id,
      teamId: inn.battingTeamId,
      meters: undefined,
      matchNumber: match.matchNumber,
    };
  }

  return {
    title: customLabel || `KEY MOMENT · ${overLabel}`,
    subtitle: `${batter?.player.name || "Live Action"} · Match #${match.matchNumber}`,
    badge: "INSTANT REPLAY",
    eventType: "highlight",
    overLabel,
    playerId: batter?.player.id,
    teamId: inn.battingTeamId,
    meters: undefined,
    matchNumber: match.matchNumber,
  };
}

let autoReturnTimer = null;

async function returnFromReplayToLive() {
  if (autoReturnTimer) {
    clearTimeout(autoReturnTimer);
    autoReturnTimer = null;
  }
  if (currentState.replays?.mode === "idle") return currentState;

  const now = Date.now();
  // Fire Exit TKPL Stinger Wipe first
  commitState((s) => ({
    ...s,
    replays: {
      ...s.replays,
      stinger: {
        id: now,
        direction: "out",
        label: "BACK TO LIVE",
        triggeredAt: now,
      },
    },
  }));

  // Mid-wipe (340ms): hide OBS replay source & restore live graphics
  await new Promise((r) => setTimeout(r, 340));
  await obsBridge.hideReplayInObs().catch(() => {});

  return commitState((s) => ({
    ...s,
    replays: {
      ...s.replays,
      mode: "idle",
      activeClipId: null,
      isSimulatedPreview: false,
    },
  }));
}

// Automatically wipe back to Live when OBS finishes playing the slow-mo clip!
obsBridge.on("replayEnded", () => {
  if (currentState.replays?.mode === "playing") {
    returnFromReplayToLive().catch(() => {});
  }
});

function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(nets)) {
    for (const info of list || []) {
      if (info.family === "IPv4" && !info.internal) {
        ips.push(info.address);
      }
    }
  }
  return ips;
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function serveStaticFile(res, filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const cacheControl = ext === ".html" ? "no-cache" : "public, max-age=3600";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function streamVideoWithRanges(req, res, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    sendJson(res, 404, { error: "Replay clip file not found on disk." });
    return;
  }
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "video/mp4";
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`,
  );
  const pathname = decodeURIComponent(urlObj.pathname);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // API: Health
  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      revision: currentState.revision,
      clients: sseClients.size,
      teams: currentState.teams.length,
      obsConnected: obsBridge.connected,
    });
    return;
  }

  // API: Network URLs
  if (pathname === "/api/network" && req.method === "GET") {
    const lanIps = getLanIps();
    sendJson(res, 200, {
      port: PORT,
      lanIps,
      localhostUrl: `http://127.0.0.1:${PORT}/`,
      overlayUrl: `http://127.0.0.1:${PORT}/overlay`,
      previewOverlayUrl: `http://127.0.0.1:${PORT}/overlay?bg=preview`,
      greenOverlayUrl: `http://127.0.0.1:${PORT}/overlay?bg=green`,
      scorerUrls: lanIps.map((ip) => `http://${ip}:${PORT}/scorer`),
      lanOverlayUrls: lanIps.map((ip) => `http://${ip}:${PORT}/overlay`),
    });
    return;
  }

  // API: Get State
  if (pathname === "/api/state" && req.method === "GET") {
    sendJson(res, 200, currentState);
    return;
  }

  // API: Save State
  if (pathname === "/api/state" && req.method === "PUT") {
    try {
      const next = await readJsonBody(req);
      const saved = commitState((prev) => ({
        ...next,
        replays: next.replays || prev.replays || defaultReplayState(),
      }));
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // API: One-shot effect trigger
  if (pathname === "/api/effect" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const now = Date.now();
      const effect = {
        ...body,
        id: now,
        triggeredAt: now,
        durationMs: body.durationMs || 5200,
      };
      const saved = commitState((s) => ({
        ...s,
        overlay: { ...s.overlay, activeEffect: effect },
      }));
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // ==================== OBS WEBSOCKET & REPLAY API ====================
  if (pathname === "/api/obs/status" && req.method === "GET") {
    if (obsBridge.connected) {
      await obsBridge.refreshObsInfo().catch(() => {});
    }
    sendJson(res, 200, obsBridge.getStatus());
    return;
  }

  if (pathname === "/api/obs/connect" && req.method === "POST") {
    try {
      const { url, password } = await readJsonBody(req);
      const status = await obsBridge.connect(url, password);
      sendJson(res, 200, status);
    } catch (err) {
      sendJson(res, 400, { error: err.message, status: obsBridge.getStatus() });
    }
    return;
  }

  if (pathname === "/api/obs/disconnect" && req.method === "POST") {
    obsBridge.disconnect();
    sendJson(res, 200, obsBridge.getStatus());
    return;
  }

  if (pathname === "/api/obs/setup-sources" && req.method === "POST") {
    try {
      const status = await obsBridge.autoSetupObsSources(
        `http://127.0.0.1:${PORT}/overlay`,
      );
      sendJson(res, 200, status);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (pathname === "/api/obs/replay-buffer" && req.method === "POST") {
    try {
      const { action } = await readJsonBody(req);
      const status = await obsBridge.setReplayBuffer(action === "start");
      sendJson(res, 200, status);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Save a Replay Clip from OBS Replay Buffer
  if (pathname === "/api/replays/save" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const savedPath = await obsBridge.saveReplayClip();
      const meta = deriveLatestBallReplayMeta(currentState, body.label);
      const clip = {
        id: `clip-${Date.now()}`,
        filePath: savedPath,
        fileName: path.basename(savedPath),
        createdAt: new Date().toISOString(),
        ...meta,
      };
      const state = commitState((s) => ({
        ...s,
        replays: {
          ...s.replays,
          clips: [clip, ...(s.replays?.clips || [])].slice(0, 40),
        },
      }));
      sendJson(res, 200, { clip, state });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Play a saved Replay Clip (or Preview Demo Replay when OBS isn't connected)
  if (pathname === "/api/replays/play" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const speedPercent = Number(body.speedPercent || 50);
      const simulate = Boolean(body.simulate) || !obsBridge.connected;

      let clip = (currentState.replays?.clips || []).find(
        (c) => c.id === body.clipId,
      );

      if (!clip && simulate) {
        const meta = deriveLatestBallReplayMeta(currentState, body.label);
        clip = {
          id: `preview-${Date.now()}`,
          filePath: "",
          fileName: "preview-simulation",
          createdAt: new Date().toISOString(),
          ...meta,
        };
      }

      if (!clip) {
        sendJson(res, 400, {
          error:
            "No saved replay clip found yet. Click 'Save Replay Clip' first, or run Preview Simulation.",
        });
        return;
      }

      const now = Date.now();
      // 1. Fire TKPL Stinger Wipe IN!
      commitState((s) => ({
        ...s,
        replays: {
          ...s.replays,
          stinger: {
            id: now,
            direction: "in",
            label: clip.badge || "INSTANT REPLAY",
            triggeredAt: now,
          },
          clips:
            simulate && !s.replays.clips.some((x) => x.id === clip.id)
              ? s.replays.clips
              : s.replays.clips,
        },
      }));

      // 2. At exact mid-wipe (340ms): swap video source ON in OBS & activate Replay HUD
      setTimeout(async () => {
        if (!simulate && clip.filePath && obsBridge.connected) {
          await obsBridge
            .playClipInObs(clip.filePath, speedPercent)
            .catch(() => {});
        }
        commitState((s) => ({
          ...s,
          replays: {
            ...s.replays,
            mode: "playing",
            activeClipId: clip.id,
            previewClip: simulate ? clip : undefined,
            speedPercent,
            isSimulatedPreview: simulate,
          },
        }));

        // In browser simulation mode, auto-return cleanly after 8.5s unless paused
        if (simulate) {
          if (autoReturnTimer) clearTimeout(autoReturnTimer);
          autoReturnTimer = setTimeout(() => {
            if (
              currentState.replays?.mode === "playing" &&
              currentState.replays?.isSimulatedPreview
            ) {
              returnFromReplayToLive().catch(() => {});
            }
          }, 8500);
        }
      }, 340);

      sendJson(res, 200, { ok: true, clip, speedPercent, simulate });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // 1-Click SAVE + PLAY SLOW-MO REPLAY!
  if (pathname === "/api/replays/save-and-play" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const speedPercent = Number(body.speedPercent || 50);
      const savedPath = await obsBridge.saveReplayClip();
      const meta = deriveLatestBallReplayMeta(currentState, body.label);
      const clip = {
        id: `clip-${Date.now()}`,
        filePath: savedPath,
        fileName: path.basename(savedPath),
        createdAt: new Date().toISOString(),
        ...meta,
      };
      const now = Date.now();
      commitState((s) => ({
        ...s,
        replays: {
          ...s.replays,
          stinger: {
            id: now,
            direction: "in",
            label: clip.badge || "INSTANT REPLAY",
            triggeredAt: now,
          },
          clips: [clip, ...(s.replays?.clips || [])].slice(0, 40),
        },
      }));

      setTimeout(async () => {
        await obsBridge
          .playClipInObs(clip.filePath, speedPercent)
          .catch(() => {});
        commitState((s) => ({
          ...s,
          replays: {
            ...s.replays,
            mode: "playing",
            activeClipId: clip.id,
            previewClip: undefined,
            speedPercent,
            isSimulatedPreview: false,
          },
        }));
      }, 340);

      sendJson(res, 200, { ok: true, clip });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Control active replay (pause / resume / restart / speed / stop -> back to live)
  if (pathname === "/api/replays/control" && req.method === "POST") {
    try {
      const { action, speedPercent } = await readJsonBody(req);
      if (action === "stop") {
        const saved = await returnFromReplayToLive();
        sendJson(res, 200, saved);
        return;
      }
      if (action === "pause") {
        await obsBridge.controlReplayPlayback("pause").catch(() => {});
        const saved = commitState((s) => ({
          ...s,
          replays: { ...s.replays, mode: "paused" },
        }));
        sendJson(res, 200, saved);
        return;
      }
      if (action === "resume") {
        await obsBridge.controlReplayPlayback("resume").catch(() => {});
        const saved = commitState((s) => ({
          ...s,
          replays: { ...s.replays, mode: "playing" },
        }));
        sendJson(res, 200, saved);
        return;
      }
      if (action === "restart") {
        await obsBridge.controlReplayPlayback("restart").catch(() => {});
        const saved = commitState((s) => ({
          ...s,
          replays: { ...s.replays, mode: "playing" },
        }));
        sendJson(res, 200, saved);
        return;
      }
      if (action === "speed") {
        const sp = Number(speedPercent || 50);
        await obsBridge.controlReplayPlayback("speed", sp).catch(() => {});
        const saved = commitState((s) => ({
          ...s,
          replays: { ...s.replays, speedPercent: sp },
        }));
        sendJson(res, 200, saved);
        return;
      }
      sendJson(res, 400, { error: "Unknown replay control action." });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Standalone TKPL Stinger Wipe trigger
  if (pathname === "/api/replays/stinger" && req.method === "POST") {
    try {
      const { label } = await readJsonBody(req);
      const now = Date.now();
      const saved = commitState((s) => ({
        ...s,
        replays: {
          ...s.replays,
          stinger: {
            id: now,
            direction: "manual",
            label: label || "TKPL 2026 REPLAY",
            triggeredAt: now,
          },
        },
      }));
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Third Umpire Decision (idle | pending | out | not-out)
  if (pathname === "/api/replays/third-umpire" && req.method === "POST") {
    try {
      const { status, note } = await readJsonBody(req);
      const saved = commitState((s) => ({
        ...s,
        replays: {
          ...s.replays,
          thirdUmpire: {
            status: status || "idle",
            note: note || "",
            updatedAt: Date.now(),
          },
        },
      }));
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Delete replay clip entry
  if (pathname.startsWith("/api/replays/clip/") && req.method === "DELETE") {
    const clipId = pathname.slice("/api/replays/clip/".length);
    const saved = commitState((s) => ({
      ...s,
      replays: {
        ...s.replays,
        clips: (s.replays?.clips || []).filter((c) => c.id !== clipId),
      },
    }));
    sendJson(res, 200, saved);
    return;
  }

  // Stream saved video clip locally for Studio preview
  if (pathname.startsWith("/api/replays/video/") && req.method === "GET") {
    const clipId = pathname.slice("/api/replays/video/".length);
    const clip = (currentState.replays?.clips || []).find(
      (c) => c.id === clipId,
    );
    streamVideoWithRanges(req, res, clip?.filePath);
    return;
  }

  // API: Save timestamped backup
  if (pathname === "/api/backup" && req.method === "POST") {
    ensureDir(BACKUPS_DIR);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `tkpl-backup-${stamp}.json`;
    fs.writeFileSync(
      path.join(BACKUPS_DIR, fileName),
      JSON.stringify(currentState, null, 2),
      "utf8",
    );
    sendJson(res, 200, { ok: true, fileName });
    return;
  }

  // API: SSE Stream
  if (pathname === "/api/stream" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify(currentState)}\n\n`);
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
    return;
  }

  // Serve public media assets (/media/...)
  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  if (pathname.startsWith("/media/")) {
    const mediaFile = path.join(PUBLIC_DIR, safePath);
    if (serveStaticFile(res, mediaFile)) return;
  }

  // Serve built frontend static assets (dist/)
  if (fs.existsSync(DIST_DIR)) {
    const distFile = path.join(
      DIST_DIR,
      safePath === "/" ? "index.html" : safePath,
    );
    if (serveStaticFile(res, distFile)) return;
    const indexFile = path.join(DIST_DIR, "index.html");
    if (serveStaticFile(res, indexFile)) return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(
    "TKPL Broadcast Server is running. Build frontend first with `npm run build`.",
  );
});

server.listen(PORT, HOST, () => {
  const ips = getLanIps();
  console.log("====================================================================");
  console.log("  TKPL 2026 - LIVE MATCH BROADCAST, SCORER & INSTANT REPLAY STUDIO");
  console.log("====================================================================");
  console.log(`  Scorer & Director Studio : http://127.0.0.1:${PORT}/scorer`);
  console.log(`  OBS Transparent Overlay  : http://127.0.0.1:${PORT}/overlay`);
  console.log(`  Browser Preview Overlay  : http://127.0.0.1:${PORT}/overlay?bg=preview`);
  console.log(`  Green Screen Overlay     : http://127.0.0.1:${PORT}/overlay?bg=green`);
  if (ips.length > 0) {
    console.log(`  Phone/Tablet Scorer WiFi : http://${ips[0]}:${PORT}/scorer`);
  }
  console.log("====================================================================");
});
