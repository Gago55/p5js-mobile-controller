# Microcontroller Bridge Server

A universal Socket.io WebSocket server that bridges a mobile **Controller** app (React / React Native) with a desktop **Display** app (p5.js) inside a shared room.

---

## Quick Start

```bash
cd server
npm install
npm start          # production
npm run dev        # auto-restart with nodemon
```

Server starts at **http://localhost:3001**  
Health check: **GET /health**

---

## Architecture

```
[Phone – Controller App]           [Desktop – p5.js Display]
        |                                     |
        | CONTROLLER_EVENT                    |
        |─────────────────────────────────────▶|
        |                                     |
        |        Server (bridge)              |
        |        maintains roomStates         |
        |                                     |
        |◀── ROOM_STATE on join ─────────────|
```

Multiple classrooms can share the same server by using different **Room IDs**  
(e.g. `room-alice`, `room-bob`). Events never cross room boundaries.

---

## Universal Event Protocol

Every event is a plain JSON object with three fields:

| Field    | Type                                        | Description                          |
|----------|---------------------------------------------|--------------------------------------|
| `type`   | `"JOYSTICK" \| "BUTTON" \| "GYRO" \| "SLIDER"` | The kind of control input            |
| `id`     | `string`                                    | Unique name for this specific control |
| `values` | `any`                                       | The current value(s) of the control  |

### Example payloads

```json
{ "type": "JOYSTICK", "id": "left-stick",  "values": { "x": 0.4, "y": -0.7 } }
{ "type": "BUTTON",   "id": "btn-jump",    "values": true }
{ "type": "GYRO",     "id": "phone-gyro",  "values": { "alpha": 12, "beta": 34, "gamma": -5 } }
{ "type": "SLIDER",   "id": "speed",       "values": 0.85 }
```

---

## Socket Events Reference

### Events the client sends → server

| Event              | Payload                                        | Description                             |
|--------------------|------------------------------------------------|-----------------------------------------|
| `JOIN_ROOM`        | `{ roomId: string, role: "controller" \| "display" }` | Join (or switch to) a room    |
| `CONTROLLER_EVENT` | `{ type, id, values }`                         | Send a control update                   |

### Events the server sends → client

| Event              | Payload                                        | Description                             |
|--------------------|------------------------------------------------|-----------------------------------------|
| `ROOM_STATE`       | `{ roomId, state: Record<id, event> }`         | Full latest state on join               |
| `CONTROLLER_EVENT` | `{ type, id, values }`                         | Forwarded event from controller         |
| `PEER_JOINED`      | `{ socketId, role }`                           | Another client joined the room          |
| `PEER_LEFT`        | `{ socketId, role }`                           | A client disconnected                   |
| `ERROR`            | `{ message: string }`                          | Validation or protocol error            |

---

## React Controller — How to Emit

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

// 1. Join a room as a controller
socket.emit("JOIN_ROOM", { roomId: "room-123", role: "controller" });

// 2. Send a joystick event
function onJoystickMove(x, y) {
  socket.emit("CONTROLLER_EVENT", {
    type: "JOYSTICK",
    id: "left-stick",
    values: { x, y },
  });
}

// 3. Send a button press
function onButtonPress(buttonName, isDown) {
  socket.emit("CONTROLLER_EVENT", {
    type: "BUTTON",
    id: buttonName,
    values: isDown,
  });
}

// 4. Send device gyroscope (from DeviceOrientationEvent)
window.addEventListener("deviceorientation", (e) => {
  socket.emit("CONTROLLER_EVENT", {
    type: "GYRO",
    id: "phone-gyro",
    values: { alpha: e.alpha, beta: e.beta, gamma: e.gamma },
  });
});

// 5. Send a slider value
function onSliderChange(sliderId, value) {
  socket.emit("CONTROLLER_EVENT", {
    type: "SLIDER",
    id: sliderId,
    values: value,
  });
}
```

---

## p5.js Display — How to Listen

Load the Socket.io client from a CDN in your `index.html`:

```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
```

Then in your `sketch.js`:

```js
let socket;

// Holds the latest state for every control id
const controllerState = {};

function setup() {
  createCanvas(800, 600);

  socket = io("http://localhost:3001");

  // Join the same room as the controller
  socket.emit("JOIN_ROOM", { roomId: "room-123", role: "display" });

  // Sync immediately on join — server sends back the latest known state
  socket.on("ROOM_STATE", ({ state }) => {
    Object.assign(controllerState, state);
    console.log("Synced room state:", controllerState);
  });

  // Handle live events from the controller
  socket.on("CONTROLLER_EVENT", (event) => {
    // Store under the event id for easy lookup in draw()
    controllerState[event.id] = event;
  });

  socket.on("ERROR", ({ message }) => {
    console.warn("Server error:", message);
  });
}

function draw() {
  background(30);

  // Example: read joystick
  const stick = controllerState["left-stick"];
  if (stick) {
    const cx = width / 2 + stick.values.x * 200;
    const cy = height / 2 + stick.values.y * 200;
    fill(0, 200, 255);
    circle(cx, cy, 40);
  }

  // Example: read a button
  const jump = controllerState["btn-jump"];
  if (jump?.values === true) {
    fill(255, 100, 0);
    text("JUMP!", 20, 30);
  }

  // Example: read gyro
  const gyro = controllerState["phone-gyro"];
  if (gyro) {
    const angle = radians(gyro.values.gamma); // tilt left/right
    push();
    translate(width / 2, height / 2);
    rotate(angle);
    rect(-30, -60, 60, 120, 8);
    pop();
  }

  // Example: read a slider
  const speed = controllerState["speed"];
  if (speed) {
    const barW = speed.values * width;
    fill(100, 255, 100);
    rect(0, height - 20, barW, 20);
  }
}
```

---

## State Management Details

The server maintains one **latest-state object per room**:

```
roomStates["room-123"] = {
  "left-stick":  { type: "JOYSTICK", id: "left-stick",  values: { x: 0.4, y: -0.7 } },
  "btn-jump":    { type: "BUTTON",   id: "btn-jump",    values: false },
  "speed":       { type: "SLIDER",   id: "speed",       values: 0.85 },
}
```

- Every `CONTROLLER_EVENT` upserts this map using `event.id` as the key.  
- When a **Display** client joins (or a p5.js sketch refreshes), the server immediately sends the full state via `ROOM_STATE` — no need for the controller to resend anything.  
- When a room becomes **empty**, its state is garbage-collected automatically.

---

## Environment Variables

| Variable | Default | Description         |
|----------|---------|---------------------|
| `PORT`   | `3001`  | HTTP / WS port      |
