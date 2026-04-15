import { io } from "socket.io-client";
import pc from "picocolors";

// ---------------------------------------------------------------------------
// CLI argument
// ---------------------------------------------------------------------------
const roomId = process.argv[2];

if (!roomId) {
  console.error(pc.red("Usage: node monitor.js <room-id>"));
  console.error(pc.dim("  e.g.  node monitor.js room-123"));
  process.exit(1);
}

const SERVER_URL = process.env.SOCKET_URL ?? "http://localhost:3001";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns HH:MM:SS timestamp string */
function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

/** Color-coded tag per event type */
function typeTag(type) {
  switch (type) {
    case "BUTTON":   return pc.green(`[${type}]`);
    case "GYRO":     return pc.blue(`[${type}]`);
    case "SLIDER":   return pc.yellow(`[${type}]`);
    case "JOYSTICK": return pc.magenta(`[${type}]`);
    default:         return pc.white(`[${type}]`);
  }
}

/** Flatten values into a readable key:val string */
function formatValues(values) {
  if (values === null || values === undefined) return pc.dim("null");
  if (typeof values === "object" && !Array.isArray(values)) {
    return Object.entries(values)
      .map(([k, v]) => `${pc.dim(k + ":")} ${typeof v === "number" ? v.toFixed(3) : v}`)
      .join("  ");
  }
  return String(values);
}

function printDivider(char = "─", width = 60) {
  console.log(pc.dim(char.repeat(width)));
}

// ---------------------------------------------------------------------------
// Socket setup
// ---------------------------------------------------------------------------
const socket = io(SERVER_URL, { transports: ["websocket"] });

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------
socket.on("connect", () => {
  printDivider("═");
  console.log(
    pc.bold(pc.cyan("  MONITOR CONNECTED")),
    pc.dim(`  id: ${socket.id}`)
  );
  console.log(
    pc.dim("  server:"),
    SERVER_URL,
    " ",
    pc.dim("room:"),
    pc.bold(roomId)
  );
  printDivider("═");
  console.log();

  socket.emit("JOIN_ROOM", { roomId, role: "display" });
});

socket.on("connect_error", (err) => {
  console.error(
    pc.red(`\n[${timestamp()}] ✖  Connection failed → ${err.message}`)
  );
  console.error(pc.dim("  Is the bridge server running at " + SERVER_URL + "?"));
  process.exit(1);
});

socket.on("disconnect", (reason) => {
  console.log(
    pc.red(`\n[${timestamp()}] ✖  Disconnected — ${reason}`)
  );
});

// ---------------------------------------------------------------------------
// Room events
// ---------------------------------------------------------------------------
socket.on("ROOM_STATE", ({ roomId: rid, state }) => {
  console.log(pc.bold(pc.cyan(`[${timestamp()}] ◎  Initial State Sync for room "${rid}"`)));

  const entries = Object.values(state);
  if (entries.length === 0) {
    console.log(pc.dim("  (room state is empty — no controller events yet)\n"));
    return;
  }

  // Build a clean table object for console.table
  const tableData = {};
  for (const entry of entries) {
    tableData[entry.id] = {
      type: entry.type,
      values: JSON.stringify(entry.values),
    };
  }
  console.table(tableData);
  console.log();
});

socket.on("PEER_JOINED", ({ socketId, role }) => {
  console.log(
    pc.green(`[${timestamp()}] ＋ PEER JOINED`),
    pc.dim(`role: ${role}  id: ${socketId}`)
  );
});

socket.on("PEER_LEFT", ({ socketId, role }) => {
  console.log(
    pc.red(`[${timestamp()}] － PEER LEFT`),
    pc.dim(`role: ${role}  id: ${socketId}`)
  );
});

// ---------------------------------------------------------------------------
// Controller events
// ---------------------------------------------------------------------------
socket.on("CONTROLLER_EVENT", ({ type, id, values }) => {
  const ts    = pc.dim(`[${timestamp()}]`);
  const tag   = typeTag(type);
  const idStr = pc.bold(`${id}`);
  const arrow = pc.dim("→");
  const vals  = formatValues(values);

  console.log(`${ts} ${tag} ${idStr} ${arrow} ${vals}`);
});

// ---------------------------------------------------------------------------
// Server errors
// ---------------------------------------------------------------------------
socket.on("ERROR", ({ message }) => {
  console.error(pc.red(`[${timestamp()}] ✖  SERVER ERROR: ${message}`));
});

// ---------------------------------------------------------------------------
// Graceful exit
// ---------------------------------------------------------------------------
process.on("SIGINT", () => {
  console.log(pc.dim("\n\n  Disconnecting…"));
  socket.disconnect();
  process.exit(0);
});
