# TKPL 2026 — Live Match Broadcast & Overlay User Guide

Welcome to your **TKPL 2026 Live Match Broadcast Studio**!  
Think of this app like a mini **Star Sports / JioCinema TV control room** running right on your laptop. All 8 TKPL franchises, team logos, and 137 finalized auction players (with their real photos) are already built in.

---

## What You Need on Match Day
1. **Windows Laptop** with **Node.js** installed (already installed on your PC).
2. **OBS Studio** (free — the exact same software you used for the TKPL Auction YouTube Live).
3. **No internet needed for the scoreboard or overlays!** Everything works **100% offline** on the ground. You only need internet to send your video stream from OBS to YouTube Live.

---

## Step 1: Start the Broadcast System (1 Click)
1. Open the **`TKPL_2026_Match_Broadcast`** folder.
2. Double-click **`start.bat`**.
3. A dark server window will open — **keep it minimized** (do not close it while streaming).
4. Your browser will automatically open the **Live Scorer & Director Studio** at:  
   `http://127.0.0.1:4280/scorer`

---

## Step 2: Test Everything Before Match Day (2 Minutes)
1. On the welcome screen, click **Load Sample Demo Match (Test OBS Now)**.
2. Click **Open Overlay Preview** in the top-right bar to open a second browser tab (`http://127.0.0.1:4280/overlay?bg=preview`).
3. Put both tabs side by side and try clicking:
   - **`4`** → watches the gold **CRACKING FOUR** animation pop up!
   - **`6`** → opens the **Six Distance Studio**. Tap anywhere outside the gold boundary circle on the mini stadium map (or tap a preset like `88m` or use the Hang-Time timer), then click **FIRE SIX** to launch the glowing red tennis-ball arc & distance odometer!
   - **`WICKET`** → plays the dramatic **OUT** shatter effect with the batter's stats and prompts for the Next Batter!
   - **TV Graphics Deck** (right side) → click **Playing XI**, **1st Inn Card**, **Over Graph**, **Points Table**, or **Most 6s / 4s** to toggle full broadcast graphics on and off!
4. When you're done testing, go to the **Points & Sponsors** tab and click the trash icon next to the demo match so your real Match #1 starts fresh.

---

## Step 3: Add the Transparent Overlay to OBS Studio
This works just like placing a clear glass sheet with live scores on top of your camera feed:
1. Open **OBS Studio** and make sure your Canvas is **`1920x1080`** (*Settings → Video*).
2. Add your **Camera** source first (bottom layer).
3. Under **Sources**, click **`+`** → choose **Browser** → name it **`TKPL Match Overlay`**.
4. Enter these exact settings:
   - **URL:** `http://127.0.0.1:4280/overlay`
   - **Width:** `1920`
   - **Height:** `1080`
   - **Custom CSS:** Leave completely empty *(100% transparent background is built in!)*
   - *(Optional)* Check **"Control audio via OBS"** if you turn **Sound FX ON** inside the Director Panel and want viewers on YouTube to hear bat-crack / siren / wicket sound effects!
5. Make sure **`TKPL Match Overlay`** is at the **TOP of your Sources list** (above your Camera).

---

## Step 4: Score From Your Phone / Tablet at the Boundary Rope (Optional!)
Want one person on the laptop managing OBS while another person scores live from a phone or tablet?
1. Connect the phone and streaming laptop to the **same Wi-Fi or mobile hotspot**.
2. In the Director Panel (right side), click **OBS URL & Phone QR**.
3. Scan the **QR Code** with your phone camera — the Live Scorer opens right on your phone and every tap updates OBS in a split second!

---

## Step 5: Scoring a Real Match
1. Click **`+ New Match`** in the top bar.
2. Pick the two TKPL teams, set overs (default **T10 = 10 Overs**), set your ground's approximate **Boundary Distance** (e.g., `58m`), and pick the Toss result.
3. Confirm the **Playing XI** (all auction players are pre-loaded — tap to toggle any player in/out).
4. Pick the 2 openers and the opening bowler → click **START LIVE MATCH**.
5. Tap runs ball-by-ball (`0, 1, 2, 3, 4, 6, WIDE, NO BALL, BYE, LEG BYE, WICKET`).
   - Made a mistake? Click **Undo Last Ball** anytime — it cleanly reverses the exact ball, strike, and score!
   - When the match ends, select **Man of the Match** — the **Points Table** and **Most 6s / 4s / Runs / Wickets** leaderboards update automatically!

---

## Step 6: Instant Slow-Motion Replays & Third Umpire (Optional — 30-Second OBS Setup)
Think of OBS Studio's **Replay Buffer** like a car dashcam that constantly keeps the last **12 seconds** of your live camera ready to replay in slow motion:
1. **Turn on Replay Buffer in OBS (once):**
   - Open OBS Studio → **Settings → Output** → check **Enable Replay Buffer** → set **Maximum Replay Time** to **`12` seconds** → click **OK**.
2. **Turn on OBS Remote Control (once):**
   - In OBS Studio → **Tools → WebSocket Server Settings** → check **Enable WebSocket server** (Port `4455`). *(Either copy the password or uncheck Enable Authentication if running locally.)*
3. **Connect from TKPL Studio (1 Click):**
   - In the right-side **Instant Slow-Mo Replays** panel, click **Connect OBS** → enter your password (if enabled) → click **Connect to OBS Studio**.
   - Click **1-Click Auto-Setup OBS Sources** — this automatically creates `TKPL Replay Video` and `TKPL Match Overlay` in the exact right layer order and starts your Replay Buffer!
4. **Play Slow-Mo Replays Live:**
   - Right after a huge SIX, FOUR, or WICKET, click **`SAVE & PLAY 0.5×`**!
   - The app automatically saves the last 12 seconds, flashes the **TKPL Stinger Wipe Transition**, plays the shot in **0.5× slow motion** with the player's name & shot info, and wipes back to live automatically when finished!
   - For tight run-outs, click **Pause** on the impact frame, click **PENDING** (*Third Umpire Decision Pending*), then reveal **OUT** or **NOT OUT**!
   - Every saved clip stays in **Saved Highlights** so you can replay the best sixes and wickets during the innings break.

---

## Quick Fixes on Match Day
- **Overlay didn't update or looks blank in OBS:** Check that the black `start.bat` server window is still open. In OBS, right-click `TKPL Match Overlay` → **Refresh cache of current page**.
- **Want to edit Sponsor messages on the bottom ticker:** Go to **Points & Sponsors** tab → add or remove any sponsor line and it updates on the live stream immediately.
- **Want to protect your tournament data between matches:** Click **Save Backup** in the **Points & Sponsors** tab — it saves a snapshot into `data/backups/`.
