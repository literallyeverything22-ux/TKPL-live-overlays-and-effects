/**
 * Reusable utility: imports all 8 TKPL 2026 franchises, finalized squads,
 * official logos, and verified player photos from the sibling
 * TKPL_2026_Auction_System folder without modifying it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const AUCTION_PLATFORM = path.resolve(
  PROJECT_ROOT,
  "..",
  "TKPL_2026_Auction_System",
  "tkpl-platform",
);

const AUCTION_STATE_PATH = path.join(
  AUCTION_PLATFORM,
  "data",
  "tkpl-auction-state.json",
);
const SRC_MEDIA_ROOT = path.join(AUCTION_PLATFORM, "public", "media", "tkpl");
const DEST_MEDIA_ROOT = path.join(PROJECT_ROOT, "public", "media", "tkpl");
const DEST_DATA_PATH = path.join(PROJECT_ROOT, "data", "tkpl-2026-teams.json");

const TEAM_SHORT_CODES = {
  "franchise-1": { shortName: "SOK", secondaryColor: "#881320" },
  "franchise-2": { shortName: "MKB", secondaryColor: "#0369A1" },
  "franchise-3": { shortName: "PP", secondaryColor: "#6B21A8" },
  "franchise-4": { shortName: "CSK", secondaryColor: "#B45309" },
  "franchise-5": { shortName: "PH", secondaryColor: "#7E22CE" },
  "franchise-6": { shortName: "VW", secondaryColor: "#92400E" },
  "franchise-7": { shortName: "KSP", secondaryColor: "#B45309" },
  "franchise-8": { shortName: "VSS", secondaryColor: "#A16207" },
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileSafe(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  ensureDir(destDir);
  let count = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function main() {
  if (!fs.existsSync(AUCTION_STATE_PATH)) {
    console.error(`[ERROR] Auction state not found at: ${AUCTION_STATE_PATH}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(AUCTION_STATE_PATH, "utf8"));
  const playersBySerial = new Map();
  for (const p of raw.players || []) {
    if (p.serialNumber) playersBySerial.set(String(p.serialNumber), p);
  }

  // Copy official brand, franchise logos, and vector graphics
  const brandCount = copyDirRecursive(
    path.join(SRC_MEDIA_ROOT, "brand"),
    path.join(DEST_MEDIA_ROOT, "brand"),
  );
  const franchiseCount = copyDirRecursive(
    path.join(SRC_MEDIA_ROOT, "franchises"),
    path.join(DEST_MEDIA_ROOT, "franchises"),
  );
  const graphicsCount = copyDirRecursive(
    path.join(SRC_MEDIA_ROOT, "graphics"),
    path.join(DEST_MEDIA_ROOT, "graphics"),
  );

  let copiedPhotos = 0;
  const teams = [];

  for (const f of raw.franchises || []) {
    const meta = TEAM_SHORT_CODES[f.id] || {
      shortName: f.teamName
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3),
      secondaryColor: "#1E3A5F",
    };

    const squad = [];
    const seenKeys = new Set();

    const addPlayer = (playerObj) => {
      const key = playerObj.serialNumber
        ? `sn:${playerObj.serialNumber}`
        : `name:${playerObj.name.toLowerCase()}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      let verifiedPhoto = "";
      if (playerObj.photo) {
        const rel = playerObj.photo.replace(/^\/+/, "");
        const srcPhoto = path.join(AUCTION_PLATFORM, "public", rel);
        const destPhoto = path.join(PROJECT_ROOT, "public", rel);
        if (copyFileSafe(srcPhoto, destPhoto)) {
          verifiedPhoto = playerObj.photo;
          copiedPhotos++;
        }
      }

      squad.push({
        id: `${f.id}-${playerObj.serialNumber || squad.length + 1}`,
        serialNumber: playerObj.serialNumber || "",
        name: cleanName(playerObj.name),
        role: playerObj.role || "All-rounder",
        battingStyle: playerObj.battingStyle || "RHB",
        bowlingStyle: playerObj.bowlingStyle || "",
        city: playerObj.city || "",
        age: playerObj.age || null,
        grade: playerObj.grade || "",
        tag: playerObj.tag || "",
        soldPrice: playerObj.soldPrice || 0,
        photo: verifiedPhoto,
      });
    };

    // 1. Pre-assigned Captain, Icon Player, U19
    const preEntries = [
      { slot: f.preAssigned?.captain, tag: "Captain" },
      { slot: f.preAssigned?.icon, tag: "Icon" },
      { slot: f.preAssigned?.u19, tag: "U19" },
    ];
    for (const { slot, tag } of preEntries) {
      if (!slot || !cleanName(slot.name)) continue;
      const linked = slot.serialNumber
        ? playersBySerial.get(String(slot.serialNumber))
        : null;
      addPlayer({
        serialNumber: slot.serialNumber || "",
        name: slot.name,
        role: linked?.role || "All-rounder",
        battingStyle: linked?.batting || "RHB",
        bowlingStyle: linked?.bowling || "",
        city: linked?.city || "",
        age: linked?.age || null,
        grade: linked?.grade || tag,
        tag,
        soldPrice: tag === "U19" ? 1500 : 10000,
        photo: linked?.photo || "",
      });
    }

    // 2. Auction-bought squad players
    const bought = (raw.players || [])
      .filter((p) => p.soldToFranchiseId === f.id)
      .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));

    for (const p of bought) {
      addPlayer({
        serialNumber: p.serialNumber || "",
        name: p.name,
        role: p.role || "All-rounder",
        battingStyle: p.batting || "RHB",
        bowlingStyle: p.bowling || "",
        city: p.city || "",
        age: p.age || null,
        grade: p.grade || "",
        tag: p.u19Flag ? "U19" : "",
        soldPrice: p.soldPrice || 0,
        photo: p.photo || "",
      });
    }

    teams.push({
      id: f.id,
      slotNumber: f.slotNumber,
      name: cleanName(f.teamName),
      shortName: meta.shortName,
      ownerName: cleanName(f.ownerName),
      coOwnerName: cleanName(f.coOwnerName),
      logo: f.logo || "",
      primaryColor: f.accentColor || "#E5B85C",
      secondaryColor: meta.secondaryColor,
      players: squad,
    });
  }

  ensureDir(path.dirname(DEST_DATA_PATH));
  const payload = {
    tournamentName: "TKPL 2026",
    tournamentSubtitle:
      "TENNIS GURU LAZER RED HARD TENNIS BALL KADAPA PREMIER LEAGUE",
    website: "TKPL.CO.IN",
    defaultOvers: 10,
    importedAt: new Date().toISOString(),
    teams,
  };
  fs.writeFileSync(DEST_DATA_PATH, JSON.stringify(payload, null, 2), "utf8");

  const totalPlayers = teams.reduce((sum, t) => sum + t.players.length, 0);
  console.log(
    `[OK] Imported ${teams.length} franchises, ${totalPlayers} squad players, ${copiedPhotos} player photos, ${brandCount} brand assets, ${franchiseCount} logos, ${graphicsCount} graphics.`,
  );
}

main();
