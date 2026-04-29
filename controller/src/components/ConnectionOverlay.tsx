import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type AppMode = "standard" | "pong";

interface Props {
  onConnect: (roomId: string, mode: AppMode) => void;
  serverUrl: string;
}

async function requestGyroPermission(): Promise<void> {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    // @ts-expect-error – requestPermission is iOS-only
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      // @ts-expect-error
      await DeviceOrientationEvent.requestPermission();
    } catch {
      // permission denied — gyro won't work but app still connects
    }
  }
}

export default function ConnectionOverlay({ onConnect, serverUrl }: Props) {
  const [roomId, setRoomId]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState<AppMode | null>(null);

  async function handleConnect(mode: AppMode) {
    const trimmed = roomId.trim();
    if (!trimmed) {
      setError("Please enter a Room ID.");
      return;
    }
    setLoading(mode);
    setError("");
    await requestGyroPermission();
    onConnect(trimmed, mode);
    setLoading(null);
  }

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center bg-gray-950 px-8 gap-8">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-2"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/60">
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 text-white" stroke="currentColor" strokeWidth={1.8}>
            <rect x="2" y="7" width="20" height="14" rx="3" />
            <path d="M8 11h8M12 11v6M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">phonepad</h1>
        <p className="text-xs font-mono text-gray-600">{serverUrl}</p>
      </motion.div>

      {/* Room ID + mode buttons */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="w-full max-w-sm flex flex-col gap-4"
      >
        <input
          type="text"
          placeholder="Room ID — e.g. room-123"
          value={roomId}
          onChange={(e) => { setRoomId(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleConnect("standard")}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-4 text-center text-lg font-mono text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Mode selection */}
        <p className="text-center text-xs text-gray-600 uppercase tracking-widest">
          Choose mode
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Standard */}
          <motion.button
            onClick={() => handleConnect("standard")}
            disabled={loading !== null}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-gray-700 bg-gray-900 p-5 text-white disabled:opacity-50 active:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-8 h-8 text-indigo-400">
              <circle cx="7"  cy="7"  r="3" />
              <circle cx="17" cy="7"  r="3" />
              <circle cx="7"  cy="17" r="3" />
              <circle cx="17" cy="17" r="3" />
            </svg>
            <span className="text-sm font-semibold">
              {loading === "standard" ? "Connecting…" : "Standard"}
            </span>
            <span className="text-xs text-gray-500 text-center leading-tight">
              Joysticks, sliders, gyro
            </span>
          </motion.button>

          {/* Pong */}
          <motion.button
            onClick={() => handleConnect("pong")}
            disabled={loading !== null}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-amber-800/60 bg-amber-950/40 p-5 text-white disabled:opacity-50 active:bg-amber-900/40 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-8 h-8 text-amber-400">
              <rect x="2"  y="4" width="3" height="16" rx="1.5" fill="currentColor" stroke="none" />
              <rect x="19" y="4" width="3" height="16" rx="1.5" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
              <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2 3" strokeOpacity={0.4} />
            </svg>
            <span className="text-sm font-semibold">
              {loading === "pong" ? "Connecting…" : "Pong"}
            </span>
            <span className="text-xs text-gray-500 text-center leading-tight">
              Tilt + UP / DOWN
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
