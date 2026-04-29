/**
 * socket-bridge.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable Socket.io bridge for p5.js sketches.
 *
 * SINGLE ROOM (most sketches)
 * ────────────────────────────
 * 1. Add to index.html (after socket.io, before sketch.js):
 *      <script src="../socket-bridge.js"></script>
 *
 * 2. In setup():
 *      bridge.connect('room-123');
 *
 * 3. In draw() read the latest state:
 *      const joy = bridge.joystick('joystick-left'); // { x, y }  -1..1
 *      const spd = bridge.slider('slider-main');     // 0..1
 *      const g   = bridge.gyro();                    // { alpha, beta, gamma }
 *      const hit = bridge.button('btn-a');           // true | false
 *
 * 4. Or subscribe to live events (runs once per event, not every frame):
 *      bridge.on('BUTTON', e => { if (e.id === 'btn-a' && e.values) jump(); });
 *
 * TWO ROOMS (e.g. 2-player Pong — each player on a different room)
 * ──────────────────────────────────────────────────────────────────
 *      const p1 = createBridge().connect('room-p1');
 *      const p2 = createBridge().connect('room-p2');
 *
 *      // In draw():
 *      const tilt1 = p1.pongTilt();   // 'forward' | 'still' | 'backward'
 *      const tilt2 = p2.pongTilt();
 *      const up1   = p1.button('btn-up');
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The server URL is auto-derived from window.location so it works on any
 * device on the LAN without configuration.
 */

(function (global) {
  "use strict";

  // ── URL resolution (same logic as the React controller) ──────────────────
  const SERVER_URL = (function () {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3001`;
  })();

  // ── Factory — creates an independent bridge instance ─────────────────────
  function createBridge() {

  const bridge = {
    /** Latest value per control id: { [id]: { type, id, values } } */
    state: {},

    /** true after the socket connects */
    connected: false,

    /** Room id passed to connect() */
    roomId: null,

    _socket: null,
    _listeners: {},

    // ── connect ─────────────────────────────────────────────────────────────
    /**
     * Connect to the bridge server and join a room.
     * Call this inside p5's setup().
     *
     * @param {string} roomId
     */
    connect(roomId) {
      if (typeof io === "undefined") {
        console.error("[bridge] socket.io client not loaded. Add the CDN script before socket-bridge.js.");
        return this;
      }

      this.roomId = roomId;
      const socket = io(SERVER_URL, { transports: ["websocket"] });
      this._socket = socket;

      socket.on("connect", () => {
        this.connected = true;
        socket.emit("JOIN_ROOM", { roomId, role: "display" });
        console.log(`[bridge] ✓ Connected → ${SERVER_URL}  room: "${roomId}"`);
      });

      socket.on("disconnect", (reason) => {
        this.connected = false;
        console.warn(`[bridge] Disconnected — ${reason}`);
      });

      // Full state snapshot sent when this display joins
      socket.on("ROOM_STATE", ({ state }) => {
        Object.assign(this.state, state);
        this._fire("sync", this.state);
        console.log("[bridge] Initial state synced:", Object.keys(this.state));
      });

      // Individual event relayed from the controller
      socket.on("CONTROLLER_EVENT", (event) => {
        this.state[event.id] = event;
        this._fire("event",    event);   // every event
        this._fire(event.type, event);   // e.g. 'JOYSTICK', 'BUTTON' …
        this._fire(event.id,   event);   // e.g. 'joystick-left', 'btn-a' …
      });

      socket.on("PEER_JOINED", ({ role }) => {
        console.log(`[bridge] Peer joined (${role})`);
        this._fire("peer_joined", { role });
      });

      socket.on("PEER_LEFT", ({ role }) => {
        console.log(`[bridge] Peer left (${role})`);
        this._fire("peer_left", { role });
      });

      socket.on("ERROR", ({ message }) => {
        console.warn("[bridge] Server error:", message);
      });

      return this;
    },

    // ── Event subscription ───────────────────────────────────────────────────
    /**
     * Subscribe to bridge events.
     *
     * Keys you can use:
     *   'event'        → every CONTROLLER_EVENT
     *   'sync'         → initial ROOM_STATE received
     *   'JOYSTICK' | 'BUTTON' | 'GYRO' | 'SLIDER'  → by type
     *   '<control-id>' → e.g. 'joystick-left', 'btn-a', 'slider-main'
     *   'peer_joined' | 'peer_left'
     *
     * @param {string}   key
     * @param {Function} cb
     */
    on(key, cb) {
      if (!this._listeners[key]) this._listeners[key] = [];
      this._listeners[key].push(cb);
      return this;
    },

    // ── Convenience getters (safe defaults when controller not connected) ────

    /**
     * Current joystick position. x/y in range -1..1.
     * Positive x = right, positive y = up.
     * @param {string} [id='joystick-left']
     * @returns {{ x: number, y: number }}
     */
    joystick(id = "joystick-left") {
      const s = this.state[id];
      return s ? s.values : { x: 0, y: 0 };
    },

    /**
     * Current button state.
     * @param {string} id  e.g. 'btn-a' | 'btn-b'
     * @returns {boolean}
     */
    button(id) {
      const s = this.state[id];
      return s ? Boolean(s.values) : false;
    },

    /**
     * Current slider value, 0..1.
     * @param {string} [id='slider-main']
     * @returns {number}
     */
    slider(id = "slider-main") {
      const s = this.state[id];
      return s !== undefined ? Number(s.values) : 0.5;
    },

    /**
     * Current gyroscope reading (standard mode).
     * @returns {{ alpha: number, beta: number, gamma: number }}
     */
    gyro() {
      const s = this.state["phone-gyro"];
      return s ? s.values : { alpha: 0, beta: 0, gamma: 0 };
    },

    /**
     * Pong tilt state — the classified beta from a Pong-mode controller.
     * Only changes when the phone crosses the tilt threshold, so no spam.
     * @returns {'forward' | 'still' | 'backward'}
     */
    pongTilt() {
      const s = this.state["pong-gyro"];
      return s ? s.values.state : "still";
    },

    // ── Internal ─────────────────────────────────────────────────────────────
    _fire(key, data) {
      (this._listeners[key] || []).forEach((cb) => {
        try { cb(data); } catch (err) { console.error("[bridge] listener error:", err); }
      });
    },
  };

  return bridge;
  } // end createBridge

  // ── Globals ───────────────────────────────────────────────────────────────
  // window.bridge       → default single-room instance (backwards compatible)
  // window.createBridge → factory for multi-room sketches
  global.createBridge = createBridge;
  global.bridge = createBridge();
})(window);
