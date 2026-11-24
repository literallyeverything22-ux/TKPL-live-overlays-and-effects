/**
 * Lightweight zero-dependency OBS WebSocket v5 Bridge (OBS Studio 28+ built-in)
 * Uses Node.js built-in global WebSocket + node:crypto SHA-256 authentication.
 */
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

const REPLAY_INPUT_NAME = "TKPL Replay Video";
const OVERLAY_INPUT_NAME = "TKPL Match Overlay";

// Event subscriptions bitmask:
// General (1<<0) | Scenes (1<<2) | Inputs (1<<3) | Outputs (1<<6) | MediaInputs (1<<8)
const EVENT_SUBSCRIPTIONS = (1 << 0) | (1 << 2) | (1 << 3) | (1 << 6) | (1 << 8);

export class ObsBridge extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.url = "ws://127.0.0.1:4455";
    this.password = "";
    this.connected = false;
    this.connecting = false;
    this.currentScene = "";
    this.replayBufferActive = false;
    this.hasReplaySource = false;
    this.hasOverlaySource = false;
    this.lastError = "";
    this.reqCounter = 1;
    this.pending = new Map();
    this.replaySaveWaiters = [];
  }

  getStatus() {
    return {
      connected: this.connected,
      connecting: this.connecting,
      url: this.url,
      currentScene: this.currentScene,
      replayBufferActive: this.replayBufferActive,
      hasReplaySource: this.hasReplaySource,
      hasOverlaySource: this.hasOverlaySource,
      replayInputName: REPLAY_INPUT_NAME,
      overlayInputName: OVERLAY_INPUT_NAME,
      lastError: this.lastError,
    };
  }

  disconnect() {
    this.connected = false;
    this.connecting = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("Disconnected from OBS"));
    }
    this.pending.clear();
    this.emit("status", this.getStatus());
  }

  async connect(url = "ws://127.0.0.1:4455", password = "") {
    this.disconnect();
    this.url = String(url || "ws://127.0.0.1:4455").trim();
    this.password = String(password || "");
    this.connecting = true;
    this.lastError = "";
    this.emit("status", this.getStatus());

    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        this.connecting = false;
        this.connected = false;
        this.lastError = msg;
        this.emit("status", this.getStatus());
        reject(new Error(msg));
      };

      const timeout = setTimeout(() => {
        fail(
          "Could not reach OBS Studio. Open OBS → Tools → WebSocket Server Settings → check 'Enable WebSocket server'.",
        );
        this.disconnect();
      }, 6500);

      let ws;
      try {
        ws = new WebSocket(this.url);
      } catch (err) {
        clearTimeout(timeout);
        fail(`Invalid OBS WebSocket URL: ${err.message}`);
        return;
      }
      this.ws = ws;

      ws.addEventListener("error", () => {
        clearTimeout(timeout);
        fail(
          "Connection refused by OBS Studio. Make sure OBS is open and Tools → WebSocket Server Settings is enabled on port 4455.",
        );
      });

      ws.addEventListener("close", (evt) => {
        clearTimeout(timeout);
        const wasConnected = this.connected;
        this.connected = false;
        this.connecting = false;
        if (!settled) {
          fail(
            evt.code === 4009
              ? "Wrong OBS WebSocket Password. Check Tools → WebSocket Server Settings → Show Connect Info."
              : `OBS closed connection (code ${evt.code}).`,
          );
        } else if (wasConnected) {
          this.lastError = "OBS Studio disconnected.";
          this.emit("status", this.getStatus());
        }
      });

      ws.addEventListener("message", async (evt) => {
        let msg;
        try {
          msg = JSON.parse(String(evt.data));
        } catch {
          return;
        }

        // Op 0: Hello
        if (msg.op === 0) {
          const auth = msg.d?.authentication;
          const identifyData = {
            rpcVersion: 1,
            eventSubscriptions: EVENT_SUBSCRIPTIONS,
          };
          if (auth && auth.challenge && auth.salt) {
            const secret = crypto
              .createHash("sha256")
              .update(this.password + auth.salt)
              .digest("base64");
            const authString = crypto
              .createHash("sha256")
              .update(secret + auth.challenge)
              .digest("base64");
            identifyData.authentication = authString;
          }
          ws.send(JSON.stringify({ op: 1, d: identifyData }));
          return;
        }

        // Op 2: Identified
        if (msg.op === 2) {
          clearTimeout(timeout);
          this.connected = true;
          this.connecting = false;
          this.lastError = "";
          await this.refreshObsInfo().catch(() => {});
          this.emit("status", this.getStatus());
          if (!settled) {
            settled = true;
            resolve(this.getStatus());
          }
          return;
        }

        // Op 7: RequestResponse
        if (msg.op === 7) {
          const id = msg.d?.requestId;
          const req = this.pending.get(id);
          if (req) {
            clearTimeout(req.timer);
            this.pending.delete(id);
            if (msg.d?.requestStatus?.result) {
              req.resolve(msg.d.responseData || {});
            } else {
              req.reject(
                new Error(
                  msg.d?.requestStatus?.comment ||
                    `OBS request ${msg.d?.requestType} failed (code ${msg.d?.requestStatus?.code})`,
                ),
              );
            }
          }
          return;
        }

        // Op 5: Event
        if (msg.op === 5) {
          this.handleObsEvent(msg.d?.eventType, msg.d?.eventData || {});
        }
      });
    });
  }

  handleObsEvent(eventType, data) {
    if (eventType === "CurrentProgramSceneChanged") {
      this.currentScene = data.sceneName || this.currentScene;
      this.refreshObsInfo().catch(() => {});
    } else if (eventType === "ReplayBufferStateChanged") {
      this.replayBufferActive = Boolean(data.outputActive);
      this.emit("status", this.getStatus());
    } else if (eventType === "ReplayBufferSaved") {
      const savedPath = data.savedReplayPath || "";
      const waiters = this.replaySaveWaiters.splice(0);
      for (const w of waiters) {
        clearTimeout(w.timer);
        w.resolve(savedPath);
      }
      this.emit("replaySaved", savedPath);
    } else if (eventType === "MediaInputPlaybackEnded") {
      if (data.inputName === REPLAY_INPUT_NAME) {
        this.emit("replayEnded");
      }
    }
  }

  request(requestType, requestData = {}, timeoutMs = 6000) {
    if (!this.connected || !this.ws) {
      return Promise.reject(new Error("OBS Studio is not connected."));
    }
    const requestId = `tkpl-${this.reqCounter++}-${Date.now()}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`OBS request timed out: ${requestType}`));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      this.ws.send(
        JSON.stringify({
          op: 6,
          d: { requestType, requestId, requestData },
        }),
      );
    });
  }

  async refreshObsInfo() {
    if (!this.connected) return this.getStatus();
    try {
      const sceneRes = await this.request("GetCurrentProgramScene");
      this.currentScene = sceneRes.currentProgramSceneName || "";
    } catch {
      // ignore
    }

    try {
      const rbRes = await this.request("GetReplayBufferStatus");
      this.replayBufferActive = Boolean(rbRes.outputActive);
    } catch {
      this.replayBufferActive = false;
    }

    if (this.currentScene) {
      try {
        const itemsRes = await this.request("GetSceneItemList", {
          sceneName: this.currentScene,
        });
        const items = itemsRes.sceneItems || [];
        this.hasReplaySource = items.some(
          (i) => i.sourceName === REPLAY_INPUT_NAME,
        );
        this.hasOverlaySource = items.some(
          (i) => i.sourceName === OVERLAY_INPUT_NAME,
        );
      } catch {
        // ignore
      }
    }

    this.emit("status", this.getStatus());
    return this.getStatus();
  }

  async getSceneItemId(sceneName, sourceName) {
    const res = await this.request("GetSceneItemId", {
      sceneName,
      sourceName,
    });
    return res.sceneItemId;
  }

  /**
   * 1-Click Auto-Setup: creates TKPL Replay Video (Media Source) and
   * TKPL Match Overlay (Browser Source) in the active OBS scene, layered cleanly!
   */
  async autoSetupObsSources(overlayUrl = "http://127.0.0.1:4280/overlay") {
    await this.refreshObsInfo();
    if (!this.currentScene) {
      throw new Error("No active scene found in OBS Studio.");
    }

    // 1. Create or ensure TKPL Replay Video source (hidden by default)
    let replayItemId = null;
    try {
      replayItemId = await this.getSceneItemId(
        this.currentScene,
        REPLAY_INPUT_NAME,
      );
    } catch {
      try {
        const created = await this.request("CreateInput", {
          sceneName: this.currentScene,
          inputName: REPLAY_INPUT_NAME,
          inputKind: "ffmpeg_source",
          inputSettings: {
            is_local_file: true,
            local_file: "",
            looping: false,
            hw_decode: true,
            restart_on_activate: true,
            close_when_inactive: true,
            speed_percent: 50,
          },
          sceneItemEnabled: false,
        });
        replayItemId = created.sceneItemId;
      } catch {
        // Input might exist in another scene — attach it to current scene
        const added = await this.request("CreateSceneItem", {
          sceneName: this.currentScene,
          sourceName: REPLAY_INPUT_NAME,
          sceneItemEnabled: false,
        });
        replayItemId = added.sceneItemId;
      }
    }

    if (replayItemId !== null) {
      await this.request("SetSceneItemTransform", {
        sceneName: this.currentScene,
        sceneItemId: replayItemId,
        sceneItemTransform: {
          boundsType: "OBS_BOUNDS_SCALE_INNER",
          boundsWidth: 1920,
          boundsHeight: 1080,
          positionX: 0,
          positionY: 0,
        },
      }).catch(() => {});
    }

    // 2. Create or ensure TKPL Match Overlay Browser Source (TOP LAYER!)
    let overlayItemId = null;
    try {
      overlayItemId = await this.getSceneItemId(
        this.currentScene,
        OVERLAY_INPUT_NAME,
      );
    } catch {
      try {
        const created = await this.request("CreateInput", {
          sceneName: this.currentScene,
          inputName: OVERLAY_INPUT_NAME,
          inputKind: "browser_source",
          inputSettings: {
            url: overlayUrl,
            width: 1920,
            height: 1080,
            fps: 60,
            fps_custom: true,
            reroute_audio: true,
            shutdown: false,
          },
          sceneItemEnabled: true,
        });
        overlayItemId = created.sceneItemId;
      } catch {
        const added = await this.request("CreateSceneItem", {
          sceneName: this.currentScene,
          sourceName: OVERLAY_INPUT_NAME,
          sceneItemEnabled: true,
        });
        overlayItemId = added.sceneItemId;
      }
    }

    // Order layers so TKPL Match Overlay is always ABOVE TKPL Replay Video
    const itemsRes = await this.request("GetSceneItemList", {
      sceneName: this.currentScene,
    });
    const totalItems = (itemsRes.sceneItems || []).length;
    if (replayItemId !== null && totalItems >= 2) {
      await this.request("SetSceneItemIndex", {
        sceneName: this.currentScene,
        sceneItemId: replayItemId,
        sceneItemIndex: Math.max(0, totalItems - 2),
      }).catch(() => {});
    }
    if (overlayItemId !== null && totalItems >= 1) {
      await this.request("SetSceneItemIndex", {
        sceneName: this.currentScene,
        sceneItemId: overlayItemId,
        sceneItemIndex: totalItems - 1,
      }).catch(() => {});
    }

    // Try starting Replay Buffer automatically (if enabled in OBS Settings -> Output)
    if (!this.replayBufferActive) {
      await this.request("StartReplayBuffer").catch(() => {});
    }

    return this.refreshObsInfo();
  }

  async setReplayBuffer(active) {
    await this.request(active ? "StartReplayBuffer" : "StopReplayBuffer");
    return this.refreshObsInfo();
  }

  async saveReplayClip() {
    if (!this.connected) {
      throw new Error("OBS Studio is not connected.");
    }
    if (!this.replayBufferActive) {
      try {
        await this.request("StartReplayBuffer");
        await new Promise((r) => setTimeout(r, 400));
        this.replayBufferActive = true;
      } catch {
        throw new Error(
          "OBS Replay Buffer is not enabled. In OBS go to Settings → Output → check 'Enable Replay Buffer' (set to 12 seconds), click OK, then click Start Replay Buffer.",
        );
      }
    }

    const waitForEvent = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.replaySaveWaiters.findIndex((w) => w.resolve === resolve);
        if (idx >= 0) this.replaySaveWaiters.splice(idx, 1);
        reject(new Error("Timed out waiting for OBS to finish saving replay clip."));
      }, 9000);
      this.replaySaveWaiters.push({ resolve, reject, timer });
    });

    await this.request("SaveReplayBuffer");
    let savedPath = "";
    try {
      savedPath = await waitForEvent;
    } catch {
      const fallback = await this.request("GetLastReplayBufferReplay").catch(
        () => ({}),
      );
      savedPath = fallback.savedReplayPath || "";
    }

    if (!savedPath) {
      throw new Error(
        "OBS saved the buffer, but no file path was returned. Check OBS Output recording path.",
      );
    }
    return savedPath;
  }

  async playClipInObs(filePath, speedPercent = 50) {
    if (!this.connected) return;
    await this.refreshObsInfo();
    if (!this.hasReplaySource) {
      await this.autoSetupObsSources();
    }
    const clampedSpeed = Math.max(25, Math.min(100, Math.round(speedPercent)));
    await this.request("SetInputSettings", {
      inputName: REPLAY_INPUT_NAME,
      inputSettings: {
        is_local_file: true,
        local_file: filePath,
        looping: false,
        hw_decode: true,
        restart_on_activate: true,
        close_when_inactive: true,
        speed_percent: clampedSpeed,
      },
      overlay: true,
    });
    const itemId = await this.getSceneItemId(
      this.currentScene,
      REPLAY_INPUT_NAME,
    );
    await this.request("SetSceneItemEnabled", {
      sceneName: this.currentScene,
      sceneItemId: itemId,
      sceneItemEnabled: true,
    });
    await this.request("TriggerMediaInputAction", {
      inputName: REPLAY_INPUT_NAME,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
    }).catch(() => {});
  }

  async controlReplayPlayback(action, speedPercent) {
    if (!this.connected) return;
    if (action === "speed" && typeof speedPercent === "number") {
      await this.request("SetInputSettings", {
        inputName: REPLAY_INPUT_NAME,
        inputSettings: {
          speed_percent: Math.max(25, Math.min(100, Math.round(speedPercent))),
        },
        overlay: true,
      });
      return;
    }
    const map = {
      pause: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE",
      resume: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
      restart: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
      stop: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
    };
    const mediaAction = map[action];
    if (mediaAction) {
      await this.request("TriggerMediaInputAction", {
        inputName: REPLAY_INPUT_NAME,
        mediaAction,
      });
    }
  }

  async hideReplayInObs() {
    if (!this.connected || !this.currentScene) return;
    try {
      const itemId = await this.getSceneItemId(
        this.currentScene,
        REPLAY_INPUT_NAME,
      );
      await this.request("SetSceneItemEnabled", {
        sceneName: this.currentScene,
        sceneItemId: itemId,
        sceneItemEnabled: false,
      });
    } catch {
      // ignore if source doesn't exist
    }
  }
}
