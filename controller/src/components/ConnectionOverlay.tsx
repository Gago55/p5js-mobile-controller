import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onConnect: (roomId: string) => void;
  serverUrl: string;
}

async function requestGyroPermission(): Promise<boolean> {
  // iOS 13+ requires explicit permission for DeviceOrientationEvent
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    // @ts-expect-error – requestPermission is iOS-only, not in standard types
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      // @ts-expect-error
      const result = await DeviceOrientationEvent.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }
  // Non-iOS: permission not required
  return true;
}

export default function ConnectionOverlay({ onConnect, serverUrl }: Props) {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    const trimmed = roomId.trim();
    if (!trimmed) {
      setError("Please enter a Room ID.");
      return;
    }
    setLoading(true);
    setError("");

    await requestGyroPermission();
    onConnect(trimmed);
    setLoading(false);
  }

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center bg-gray-950 px-8 gap-8">
      {/* Logo / title */}
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
        <h1 className="text-2xl font-bold tracking-tight text-white">Controller</h1>
        <p className="text-sm text-gray-400">Enter the Room ID to connect</p>
        <p className="text-xs font-mono text-gray-600 mt-1">{serverUrl}</p>
      </motion.div>

      {/* Input card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="w-full max-w-sm flex flex-col gap-4"
      >
        <input
          type="text"
          placeholder="e.g. room-123"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-4 text-center text-lg font-mono text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

        {error && (
          <p className="text-center text-sm text-red-400">{error}</p>
        )}

        <motion.button
          onClick={handleStart}
          disabled={loading}
          whileTap={{ scale: 0.96 }}
          className="w-full rounded-xl bg-indigo-600 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-900/50 active:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Connecting…" : "Start"}
        </motion.button>
      </motion.div>
    </div>
  );
}
