import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSocket, type ConnectionStatus } from "./hooks/useSocket";
import ConnectionOverlay, { type AppMode } from "./components/ConnectionOverlay";
import Panel, { type ControlItem, MAX_BUTTONS, MAX_SLIDERS, MAX_JOYSTICKS } from "./components/Panel";
import PongController from "./components/PongController";

// ── Default control lists ─────────────────────────────────────────────────────

const DEFAULT_BUTTONS: ControlItem[] = [
  { id: "btn-a", label: "A" },
  { id: "btn-b", label: "B" },
  { id: "btn-c", label: "C" },
  { id: "btn-d", label: "D" },
];

const DEFAULT_SLIDERS: ControlItem[] = [
  { id: "slider-1", label: "Slider 1" },
  { id: "slider-2", label: "Slider 2" },
  { id: "slider-3", label: "Slider 3" },
  { id: "slider-4", label: "Slider 4" },
];

const DEFAULT_JOYSTICKS: ControlItem[] = [
  { id: "joystick-left",  label: "Left"  },
  { id: "joystick-right", label: "Right" },
];

// ── Status dot styles ─────────────────────────────────────────────────────────

const STATUS_DOT: Record<ConnectionStatus, string> = {
  connected:    "bg-emerald-400 shadow-emerald-400/60 animate-pulse",
  connecting:   "bg-yellow-400  shadow-yellow-400/60  animate-pulse",
  disconnected: "bg-gray-600",
  error:        "bg-red-500     shadow-red-500/60     animate-pulse",
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected:    "connected",
  connecting:   "connecting…",
  disconnected: "disconnected",
  error:        "error — retrying",
};

// ── Split icon ────────────────────────────────────────────────────────────────

function SplitIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.8}>
      <rect x="2" y="2" width="16" height="7" rx="1.5"
        fill={active ? "currentColor" : "none"} fillOpacity={0.25} />
      <rect x="2" y="11" width="16" height="7" rx="1.5"
        fill={active ? "currentColor" : "none"} fillOpacity={0.25} />
      <line x1="2" y1="10" x2="18" y2="10" strokeDasharray="2 2" />
    </svg>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [roomId, setRoomId]       = useState<string | null>(null);
  const [mode, setMode]           = useState<AppMode>("standard");
  const [splitMode, setSplitMode] = useState(false);
  const { emit, status, serverUrl } = useSocket(roomId);

  function handleConnect(id: string, m: AppMode) {
    setMode(m);
    setRoomId(id);
  }

  function handleLeave() {
    setRoomId(null);
    setSplitMode(false);
  }

  // ── Dynamic control lists ────────────────────────────────────────────────
  const [buttons,   setButtons]   = useState<ControlItem[]>(DEFAULT_BUTTONS);
  const [sliders,   setSliders]   = useState<ControlItem[]>(DEFAULT_SLIDERS);
  const [joysticks, setJoysticks] = useState<ControlItem[]>(DEFAULT_JOYSTICKS);

  // ── Add / remove callbacks ───────────────────────────────────────────────
  const addButton = useCallback(() => {
    setButtons((prev) => {
      if (prev.length >= MAX_BUTTONS) return prev;
      const n = prev.length + 1;
      return [...prev, { id: `btn-${n}`, label: String(n) }];
    });
  }, []);

  const removeButton = useCallback((id: string) => {
    setButtons((prev) => prev.length > 1 ? prev.filter((b) => b.id !== id) : prev);
  }, []);

  const addSlider = useCallback(() => {
    setSliders((prev) => {
      if (prev.length >= MAX_SLIDERS) return prev;
      const n = prev.length + 1;
      return [...prev, { id: `slider-${n}`, label: `Slider ${n}` }];
    });
  }, []);

  const removeSlider = useCallback((id: string) => {
    setSliders((prev) => prev.length > 1 ? prev.filter((s) => s.id !== id) : prev);
  }, []);

  const addJoystick = useCallback(() => {
    setJoysticks((prev) => {
      if (prev.length >= MAX_JOYSTICKS) return prev;
      const n = prev.length + 1;
      return [...prev, { id: `joystick-${n}`, label: `Stick ${n}` }];
    });
  }, []);

  const removeJoystick = useCallback((id: string) => {
    setJoysticks((prev) => prev.length > 1 ? prev.filter((j) => j.id !== id) : prev);
  }, []);

  // ── Shared panel props ───────────────────────────────────────────────────
  const panelProps = {
    emit,
    buttons, sliders, joysticks,
    onAddButton:      addButton,
    onRemoveButton:   removeButton,
    onAddSlider:      addSlider,
    onRemoveSlider:   removeSlider,
    onAddJoystick:    addJoystick,
    onRemoveJoystick: removeJoystick,
  };

  return (
    <div className="flex h-dvh w-full flex-col bg-gray-950 text-white overflow-hidden">

      {/* ── Connection overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!roomId && (
          <motion.div
            key="overlay"
            className="absolute inset-0 z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <ConnectionOverlay onConnect={handleConnect} serverUrl={serverUrl} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controller UI ──────────────────────────────────────────────────── */}
      {roomId && (
        <motion.div
          key="controller"
          className="flex flex-col h-full min-h-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full shadow ${STATUS_DOT[status]}`} />
              <span className="text-xs font-mono text-gray-500">{roomId}</span>
              <span className="text-xs text-gray-700">·</span>
              <span className="text-xs text-gray-600">{STATUS_LABEL[status]}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Split toggle — only in standard mode */}
              {mode === "standard" && (
                <button
                  onClick={() => setSplitMode((v) => !v)}
                  className={`
                    flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors
                    ${splitMode
                      ? "bg-indigo-700/60 text-indigo-300"
                      : "bg-gray-800 text-gray-500 hover:text-gray-300"}
                  `}
                >
                  <SplitIcon active={splitMode} />
                  <span>Split</span>
                </button>
              )}

              {/* Mode badge */}
              {mode === "pong" && (
                <span className="rounded-lg px-2.5 py-1.5 text-xs bg-amber-900/40 text-amber-400 font-semibold tracking-wide">
                  PONG
                </span>
              )}

              <button
                onClick={handleLeave}
                className="rounded-lg px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors"
              >
                Leave
              </button>
            </div>
          </header>

          {/* ── Panel area — branches on mode ─────────────────────────────── */}
          {mode === "pong" ? (
            <div className="flex-1 min-h-0">
              <PongController emit={emit} />
            </div>
          ) : splitMode ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 border-b border-gray-800">
                <Panel {...panelProps} defaultTab="gyro" compact />
              </div>
              <div className="flex-1 min-h-0">
                <Panel {...panelProps} defaultTab="joysticks" compact />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <Panel {...panelProps} defaultTab="gyro" />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
