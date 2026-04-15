import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSocket, type ConnectionStatus } from "./hooks/useSocket";
import ConnectionOverlay from "./components/ConnectionOverlay";
import GyroscopePanel from "./components/GyroscopePanel";
import ActionButtons from "./components/ActionButtons";
import ControlSlider from "./components/ControlSlider";
import VirtualJoystick from "./components/VirtualJoystick";

const STATUS_DOT: Record<ConnectionStatus, string> = {
  connected:    "bg-emerald-400 shadow-emerald-400/60 animate-pulse",
  connecting:   "bg-yellow-400 shadow-yellow-400/60 animate-pulse",
  disconnected: "bg-gray-600",
  error:        "bg-red-500 shadow-red-500/60 animate-pulse",
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected:    "connected",
  connecting:   "connecting…",
  disconnected: "disconnected",
  error:        "error — retrying",
};

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const { emit, status, serverUrl } = useSocket(roomId);

  return (
    <div className="flex h-dvh w-full flex-col bg-gray-950 text-white overflow-hidden">
      <AnimatePresence>
        {!roomId && (
          <motion.div
            key="overlay"
            className="absolute inset-0 z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            <ConnectionOverlay onConnect={setRoomId} serverUrl={serverUrl} />
          </motion.div>
        )}
      </AnimatePresence>

      {roomId && (
        <motion.div
          key="controller"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex h-full flex-col px-4 py-3 gap-3"
        >
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full shadow ${STATUS_DOT[status]}`} />
              <span className="text-xs font-mono text-gray-400">
                {roomId}
              </span>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-500">{STATUS_LABEL[status]}</span>
            </div>
            <button
              onClick={() => setRoomId(null)}
              className="rounded-lg px-3 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Leave
            </button>
          </header>

          {/* Gyroscope readout */}
          <GyroscopePanel emit={emit} />

          {/* Joystick + Buttons row */}
          <div className="flex flex-1 items-center justify-between px-2 min-h-0">
            <VirtualJoystick id="joystick-left" label="Move" emit={emit} />
            <ActionButtons emit={emit} />
          </div>

          {/* Slider */}
          <div className="pb-safe">
            <ControlSlider id="slider-main" label="Precision" emit={emit} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
