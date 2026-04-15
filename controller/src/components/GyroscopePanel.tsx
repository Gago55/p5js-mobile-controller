import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useThrottle } from "../hooks/useThrottle";
import type { ControllerEvent } from "../hooks/useSocket";

interface GyroValues {
  alpha: number;
  beta: number;
  gamma: number;
}

interface Props {
  emit: (event: ControllerEvent) => void;
}

const RATE_MIN = 16;   // ms — ~60fps, fastest useful rate
const RATE_MAX = 200;  // ms — 5fps, slowest

const RATE_PRESETS = [
  { label: "16", value: 16 },
  { label: "33", value: 33 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

function barPercent(value: number, range = 180): number {
  return Math.min(100, Math.max(0, ((value + range) / (range * 2)) * 100));
}

export default function GyroscopePanel({ emit }: Props) {
  const [gyro, setGyro]         = useState<GyroValues>({ alpha: 0, beta: 0, gamma: 0 });
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled]   = useState(true);
  const [rateMs, setRateMs]     = useState(150); // default ~30fps
  const enabledRef              = useRef(enabled);

  // Keep ref in sync so the orientation handler always reads the latest value
  // without needing to re-register the listener on every toggle.
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // --- emit throttle (dynamic — recreated when rateMs changes) --------------
  const handleEmit = useCallback(
    (values: GyroValues) => emit({ type: "GYRO", id: "phone-gyro", values }),
    [emit]
  );
  const throttledEmit   = useThrottle(handleEmit, rateMs);
  const throttledSetGyro = useThrottle(setGyro, Math.max(rateMs, 50));

  // --- device orientation listener ------------------------------------------
  useEffect(() => {
    if (!("DeviceOrientationEvent" in window)) {
      setSupported(false);
      return;
    }

    function onOrientation(e: DeviceOrientationEvent) {
      if (!enabledRef.current) return;
      const values: GyroValues = {
        alpha: e.alpha ?? 0,
        beta:  e.beta  ?? 0,
        gamma: e.gamma ?? 0,
      };
      throttledEmit(values);
      throttledSetGyro(values);
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [throttledEmit, throttledSetGyro]);

  // --- axes config ----------------------------------------------------------
  const axes: { label: string; key: keyof GyroValues; range: number }[] = [
    { label: "α", key: "alpha", range: 180 },
    { label: "β", key: "beta",  range: 90  },
    { label: "γ", key: "gamma", range: 90  },
  ];

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3">

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Gyroscope
        </span>

        <div className="flex items-center gap-3">
          {!supported && (
            <span className="text-xs text-red-400">Not supported</span>
          )}

          {/* On / Off toggle */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setEnabled((v) => !v)}
            className={`
              relative flex h-6 w-11 items-center rounded-full transition-colors duration-200
              ${enabled ? "bg-indigo-600" : "bg-gray-700"}
            `}
            aria-label="Toggle gyroscope"
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 700, damping: 30 }}
              className={`
                absolute h-4 w-4 rounded-full bg-white shadow
                ${enabled ? "left-6" : "left-1"}
              `}
            />
          </button>
        </div>
      </div>

      {/* ── Axis bars (dim when off) ─────────────────────────────────────── */}
      <div className={`flex flex-col gap-2 transition-opacity duration-200 ${enabled ? "opacity-100" : "opacity-30"}`}>
        {axes.map(({ label, key, range }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-4 text-xs text-gray-500 font-mono">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-75"
                style={{ width: `${barPercent(gyro[key], range)}%` }}
              />
            </div>
            <span className="w-14 text-right text-xs font-mono text-gray-400">
              {gyro[key].toFixed(1)}°
            </span>
          </div>
        ))}
      </div>

      {/* ── Rate control (only when enabled) ─────────────────────────────── */}
      <div className={`flex flex-col gap-2 transition-opacity duration-200 ${enabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Rate</span>
          <span className="text-xs font-mono text-indigo-400">{rateMs} ms</span>
        </div>

        {/* Preset chips */}
        <div className="flex gap-2">
          {RATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setRateMs(p.value)}
              className={`
                flex-1 rounded-lg py-1 text-xs font-mono transition-colors
                ${rateMs === p.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"}
              `}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Fine-tune slider */}
        <input
          type="range"
          min={RATE_MIN}
          max={RATE_MAX}
          step={1}
          value={rateMs}
          onChange={(e) => setRateMs(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>{RATE_MIN} ms (fast)</span>
          <span>{RATE_MAX} ms (slow)</span>
        </div>
      </div>

    </div>
  );
}
