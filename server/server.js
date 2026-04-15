import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Express + HTTP server
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    rooms: getRoomSummary(),
  });
});

const httpServer = createServer(app);

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Tighten this to your client origins in production
    methods: ["GET", "POST"],
  },
});

// ---------------------------------------------------------------------------
// State
// Room state shape:
//   roomStates[roomId] = {
//     [eventId]: { type, id, values }   ← latest value per control id
//   }
// ---------------------------------------------------------------------------

/** @type {Map<string, Record<string, object>>} */
const roomStates = new Map();

function getOrCreateRoom(roomId) {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {});
  }
  return roomStates.get(roomId);
}

function getRoomSummary() {
  const summary = {};
  for (const [roomId, state] of roomStates.entries()) {
    summary[roomId] = {
      controlCount: Object.keys(state).length,
    };
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Allowed event types (validation guard)
// ---------------------------------------------------------------------------
const VALID_TYPES = new Set(["JOYSTICK", "BUTTON", "GYRO", "SLIDER"]);

/**
 * Validates the universal event payload.
 * @param {unknown} payload
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateEvent(payload) {
  if (!payload || typeof payload !== "object") {
    return { valid: false, reason: "Payload must be an object." };
  }
  const { type, id, values } = payload;

  if (!VALID_TYPES.has(type)) {
    return {
      valid: false,
      reason: `Unknown type "${type}". Allowed: ${[...VALID_TYPES].join(", ")}.`,
    };
  }
  if (typeof id !== "string" || id.trim() === "") {
    return { valid: false, reason: '"id" must be a non-empty string.' };
  }
  if (values === undefined) {
    return { valid: false, reason: '"values" field is required.' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Socket events
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`[connect]   ${socket.id}`);

  // ── JOIN_ROOM ─────────────────────────────────────────────────────────────
  // Payload: { roomId: string, role: "controller" | "display" }
  socket.on("JOIN_ROOM", ({ roomId, role } = {}) => {
    if (!roomId || typeof roomId !== "string") {
      socket.emit("ERROR", { message: "JOIN_ROOM requires a valid roomId." });
      return;
    }

    // Leave any previously joined rooms (other than the socket's own room)
    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role ?? "unknown";

    console.log(`[join]      ${socket.id} → room "${roomId}" as ${socket.data.role}`);

    // Send the current room state immediately so displays can sync on join
    const currentState = getOrCreateRoom(roomId);
    socket.emit("ROOM_STATE", { roomId, state: currentState });

    // Notify others in the room
    socket.to(roomId).emit("PEER_JOINED", {
      socketId: socket.id,
      role: socket.data.role,
    });
  });

  // ── CONTROLLER_EVENT ──────────────────────────────────────────────────────
  // Payload: { type: string, id: string, values: any }
  socket.on("CONTROLLER_EVENT", (payload) => {
    const roomId = socket.data.roomId;

    if (!roomId) {
      socket.emit("ERROR", {
        message: "You must join a room before sending events.",
      });
      return;
    }

    const { valid, reason } = validateEvent(payload);
    if (!valid) {
      socket.emit("ERROR", { message: reason });
      return;
    }

    // Persist latest value for this control id
    const roomState = getOrCreateRoom(roomId);
    roomState[payload.id] = {
      type: payload.type,
      id: payload.id,
      values: payload.values,
    };

    // Broadcast to everyone else in the room (not back to the sender)
    socket.to(roomId).emit("CONTROLLER_EVENT", payload);

    console.log(
      `[event]     room "${roomId}" | ${payload.type}:${payload.id} →`,
      JSON.stringify(payload.values)
    );
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    const roomId = socket.data.roomId;
    console.log(`[disconnect] ${socket.id} (${reason})`);

    if (roomId) {
      socket.to(roomId).emit("PEER_LEFT", {
        socketId: socket.id,
        role: socket.data.role,
      });

      // Clean up room state if the room is now empty
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      if (!roomSockets || roomSockets.size === 0) {
        roomStates.delete(roomId);
        console.log(`[cleanup]   room "${roomId}" is empty — state cleared.`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`\n🚀  Bridge server running at http://localhost:${PORT}`);
  console.log(`    Health check → GET /health\n`);
});
