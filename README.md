# p5js-mobile-controller 

Turn your phone into a wireless game controller for p5.js sketches — or any browser-based canvas app.

A joystick, buttons, sliders, and gyroscope on your phone. A WebSocket bridge in the middle. Your p5.js sketch on the other end. Everything talks in real time over your local network.

---

## How it works

```
┌─────────────────────┐        WebSocket         ┌─────────────────────┐
│   Phone (browser)   │ ──── CONTROLLER_EVENT ──▶ │   Bridge Server     │
│   /controller app   │                           │   /server           │
│                     │ ◀──── ROOM_STATE ───────── │   (Socket.io)       │
└─────────────────────┘                           └────────┬────────────┘
                                                           │  CONTROLLER_EVENT
                                                           ▼
                                                  ┌─────────────────────┐
                                                  │   Desktop (browser) │
                                                  │   p5.js sketch      │
                                                  │   /p5               │
                                                  └─────────────────────┘
```

Multiple students can share the same server simultaneously — each pair of devices joins a **Room ID** and events never cross room boundaries.

---

## Project structure

```
phonepad/
├── server/          ← Node.js + Socket.io bridge server
├── controller/      ← Vite + React + TypeScript mobile controller UI
├── p5/
│   ├── socket-bridge.js      ← reusable Socket.io client for p5 sketches
│   └── sketch-01/            ← example p5.js sketch
└── test/
    └── monitor.js            ← terminal logger for live debugging
```

---

## Quick start

### 1 — Bridge server

```bash
cd server
npm install
npm start
# → http://localhost:3001
```

### 2 — Controller app (phone)

```bash
cd controller
npm install
npm run dev
# → Vite prints a LAN URL like https://192.168.1.42:5173
#   Open that URL on your phone
```

> **First time on Android:** Chrome will warn about the self-signed certificate.  
> Tap **Advanced → Proceed** — this is normal for local dev HTTPS.

### 3 — p5.js sketch (desktop)

Open `p5/sketch-01/index.html` in a browser (e.g. via VS Code Live Server).  
Edit `ROOM_ID` at the top of `sketch.js` to match what you type on your phone.

### 4 — Optional terminal monitor

```bash
cd test
npm install
node monitor.js room-123
```

---

## Controller app

The mobile UI is split into four tabs:

| Tab | Controls | Default | Max |
|---|---|---|---|
| **Gyro** | Gyroscope readout | — | — |
| **Buttons** | Large tactile buttons | 4 | 8 |
| **Sliders** | Horizontal precision sliders | 4 | 8 |
| **Sticks** | Virtual joystick(s) | 2 | 4 |

**Adding / removing controls** — each tab (except Gyro) has a `−` / `+` bar. Tap `+` to add a new control, `−` to remove the last one. Each control gets a unique auto-generated ID that is sent with every event.

**Split-screen mode** — tap the **Split** button in the header to show two tabs simultaneously, stacked top and bottom. Each half has its own independent tab bar. Useful for running Gyro and Sticks at the same time.

**Gyro rate control** — the Gyroscope tab has an on/off toggle and a rate slider (16 – 200 ms between network emits). Use the preset chips for quick picks or drag the slider for fine-tuning.

---

## Event protocol

Every event sent from the controller follows this structure:

```json
{ "type": "JOYSTICK" | "BUTTON" | "GYRO" | "SLIDER", "id": "string", "values": any }
```

### Default control IDs

| Control | ID |
|---|---|
| Joystick 1 | `joystick-left` |
| Joystick 2 | `joystick-right` |
| Button A–D | `btn-a`, `btn-b`, `btn-c`, `btn-d` |
| Slider 1–4 | `slider-1`, `slider-2`, `slider-3`, `slider-4` |
| Gyroscope | `phone-gyro` |

### Value shapes

```js
// Joystick — x/y in range -1..1 (positive x = right, positive y = up)
{ type: "JOYSTICK", id: "joystick-left", values: { x: 0.4, y: -0.7 } }

// Button — true on press, false on release
{ type: "BUTTON", id: "btn-a", values: true }

// Gyroscope — device orientation angles in degrees
{ type: "GYRO", id: "phone-gyro", values: { alpha: 120, beta: 34, gamma: -12 } }

// Slider — 0..1
{ type: "SLIDER", id: "slider-1", values: 0.75 }
```

---

## Using socket-bridge.js in your own p5 sketch

```html
<!-- index.html — load in this order -->
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script src="../socket-bridge.js"></script>
<script src="sketch.js"></script>
```

```js
// sketch.js
function setup() {
  createCanvas(windowWidth, windowHeight);
  bridge.connect("room-123");
}

function draw() {
  const joy = bridge.joystick("joystick-left"); // { x, y }  -1..1
  const spd = bridge.slider("slider-1");         // 0..1
  const g   = bridge.gyro();                     // { alpha, beta, gamma }
  const hit = bridge.button("btn-a");            // true | false
}
```

### bridge API

| Method | Returns | Description |
|---|---|---|
| `bridge.connect(roomId)` | `bridge` | Join a room as display. Call in `setup()`. |
| `bridge.joystick(id?)` | `{ x, y }` | Latest joystick position. Default id: `joystick-left`. |
| `bridge.button(id)` | `boolean` | Latest button state. |
| `bridge.slider(id?)` | `0..1` | Latest slider value. Default id: `slider-1`. |
| `bridge.gyro()` | `{ alpha, beta, gamma }` | Latest gyroscope reading. |
| `bridge.on(key, cb)` | `bridge` | Subscribe to events by type (`'JOYSTICK'`), id (`'btn-a'`), or lifecycle (`'sync'`, `'peer_joined'`). |

The bridge auto-detects the server URL from `window.location.hostname`, so it works on any device on the LAN without configuration.

---

## Server socket events

### Client → server

| Event | Payload | Description |
|---|---|---|
| `JOIN_ROOM` | `{ roomId, role: "controller" \| "display" }` | Join a room |
| `CONTROLLER_EVENT` | `{ type, id, values }` | Send a control update |

### Server → client

| Event | Payload | Description |
|---|---|---|
| `ROOM_STATE` | `{ roomId, state }` | Full state snapshot on join |
| `CONTROLLER_EVENT` | `{ type, id, values }` | Forwarded event from controller |
| `PEER_JOINED` | `{ socketId, role }` | Another client joined |
| `PEER_LEFT` | `{ socketId, role }` | A client disconnected |
| `ERROR` | `{ message }` | Validation or protocol error |

The server maintains the latest value for every control ID so that a p5 sketch that refreshes immediately receives the current state without the controller needing to resend anything.

---

## Terminal monitor

```bash
cd test
node monitor.js <room-id>

# Target a remote server
SOCKET_URL=http://192.168.1.42:3001 node monitor.js room-123
```

Color-coded output by event type:

| Type | Color |
|---|---|
| BUTTON | Green |
| GYRO | Blue |
| SLIDER | Yellow |
| JOYSTICK | Magenta |

Logs peer connections, disconnections, and the initial room state sync as a `console.table`.

---

## Tech stack

| Layer | Tech |
|---|---|
| Bridge server | Node.js, Express, Socket.io 4 |
| Controller UI | Vite, React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Display client | p5.js, Socket.io client (CDN) |
| Dev monitor | Node.js, socket.io-client, picocolors |

---

## Environment variables

**`controller/.env`**

| Variable | Default | Description |
|---|---|---|
| `VITE_SOCKET_URL` | `http://localhost:3001` | Server URL (desktop only — phones auto-detect via `window.location.hostname`) |

**`test/monitor.js`**

| Variable | Default | Description |
|---|---|---|
| `SOCKET_URL` | `http://localhost:3001` | Server URL |
