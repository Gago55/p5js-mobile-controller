import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ControllerEvent } from "../hooks/useSocket";

// ── Types ────────────────────────────────────────────────────────────────────

export type TiltState = "forward" | "still" | "backward";

// ── Config ───────────────────────────────────────────────────────────────────

/**
 * Degrees of beta tilt before classifying as "forward" or "backward".
 * Increase to require a more deliberate tilt, decrease for hair-trigger.
 */
const THRESHOLD = 10;

function classifyBeta(beta: number): TiltState {
  if (beta >  THRESHOLD) return "forward";
  if (beta < -THRESHOLD) return "backward";
  return "still";
}

// ── Tilt state visual config ─────────────────────────────────────────────────

const TILT_CONFIG: Record<TiltState, {
  border: string;
  bg: string;
  dot: string;
  text: string;
  label: string;
  arrow: string;
}> = {
  forward: {
    border: "border-indigo-500/40",
    bg:     "bg-indigo-600/15",
    dot:    "bg-indigo-400",
    text:   "text-indigo-300",
    label:  "FORWARD",
    arrow:  "↑",
  },
  still: {
    border: "border-gray-700",
    bg:     "bg-gray-800/30",
    dot:    "bg-gray-500",
    text:   "text-gray-400",
    label:  "STILL",
    arrow:  "●",
  },
  backward: {
    border: "border-amber-500/40",
    bg:     "bg-amber-600/15",
    dot:    "bg-amber-400",
    text:   "text-amber-300",
    label:  "BACKWARD",
    arrow:  "↓",
  },
};

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  emit: (event: ControllerEvent) => void;
}

export default function PongController({ emit }: Props) {
  const [tiltState, setTiltState] = useState<TiltState>("still");
  const [beta, setBeta]           = useState(0);
  const [pressedUp,   setPressedUp]   = useState(false);
  const [pressedDown, setPressedDown] = useState(false);

  // Ref so the orientation handler always reads the current state
  // without needing to re-register the listener on every render
  const lastStateRef = useRef<TiltState>("still");

  // ── Gyro — emit ONLY when classified state changes ───────────────────────
  useEffect(() => {
    if (!("DeviceOrientationEvent" in window)) return;

    function onOrientation(e: DeviceOrientationEvent) {
      const b = e.beta ?? 0;
      setBeta(b);

      const next = classifyBeta(b);
      if (next === lastStateRef.current) return; // no change → no emit

      lastStateRef.current = next;
      setTiltState(next);
      emit({ type: "GYRO", id: "pong-gyro", values: { state: next } });
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [emit]);

  // ── Button helpers ───────────────────────────────────────────────────────
  function pressBtn(id: string, setter: (v: boolean) => void) {
    setter(true);
    emit({ type: "BUTTON", id, values: true });
  }
  function releaseBtn(id: string, setter: (v: boolean) => void) {
    setter(false);
    emit({ type: "BUTTON", id, values: false });
  }

  const cfg = TILT_CONFIG[tiltState];

  return (
    <div className="flex flex-col h-full min-h-0 p-3 gap-3">

      {/* ── Tilt state strip ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tiltState}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{   opacity: 0, y:  4 }}
          transition={{ duration: 0.12 }}
          className={`
            shrink-0 rounded-2xl border px-5 py-3
            flex items-center justify-between
            ${cfg.border} ${cfg.bg}
          `}
        >
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
            <span className={`text-sm font-bold tracking-widest ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>
          <span className={`text-xs font-mono ${cfg.text} opacity-50`}>
            β {beta.toFixed(1)}°
          </span>
        </motion.div>
      </AnimatePresence>

      {/* ── UP button ─────────────────────────────────────────────────────── */}
      <motion.button
        onPointerDown={() => pressBtn("btn-up", setPressedUp)}
        onPointerUp={()   => releaseBtn("btn-up", setPressedUp)}
        onPointerLeave={() => { if (pressedUp) releaseBtn("btn-up", setPressedUp); }}
        animate={pressedUp
          ? { scale: 0.95, opacity: 0.85 }
          : { scale: 1,    opacity: 1 }}
        transition={{ type: "spring", stiffness: 700, damping: 28 }}
        className={`
          flex-1 min-h-0 rounded-2xl flex flex-col items-center justify-center gap-3
          select-none touch-none font-black text-white transition-colors
          shadow-lg shadow-indigo-950/60
          ${pressedUp ? "bg-indigo-500" : "bg-indigo-700"}
        `}
      >
        <span className="text-6xl leading-none">↑</span>
        <span className="text-2xl tracking-[0.2em]">UP</span>
      </motion.button>

      {/* ── DOWN button ───────────────────────────────────────────────────── */}
      <motion.button
        onPointerDown={() => pressBtn("btn-down", setPressedDown)}
        onPointerUp={()   => releaseBtn("btn-down", setPressedDown)}
        onPointerLeave={() => { if (pressedDown) releaseBtn("btn-down", setPressedDown); }}
        animate={pressedDown
          ? { scale: 0.95, opacity: 0.85 }
          : { scale: 1,    opacity: 1 }}
        transition={{ type: "spring", stiffness: 700, damping: 28 }}
        className={`
          flex-1 min-h-0 rounded-2xl flex flex-col items-center justify-center gap-3
          select-none touch-none font-black text-white transition-colors
          shadow-lg shadow-amber-950/60
          ${pressedDown ? "bg-amber-500" : "bg-amber-700"}
        `}
      >
        <span className="text-2xl tracking-[0.2em]">DOWN</span>
        <span className="text-6xl leading-none">↓</span>
      </motion.button>

    </div>
  );
}
