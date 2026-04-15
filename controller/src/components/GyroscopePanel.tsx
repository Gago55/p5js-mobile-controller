import { useEffect, useState, useCallback } from "react";
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

function clamp(v: number | null, digits = 1): string {
  if (v === null) return "–";
  return v.toFixed(digits);
}

// Colour-code the bar fill based on value
function barPercent(value: number | null, range = 180): number {
  if (value === null) return 50;
  return Math.min(100, Math.max(0, ((value + range) / (range * 2)) * 100));
}

export default function GyroscopePanel({ emit }: Props) {
  const [gyro, setGyro] = useState<GyroValues>({ alpha: 0, beta: 0, gamma: 0 });
  const [supported, setSupported] = useState(true);

  const handleEmit = useCallback(
    (values: GyroValues) => {
      emit({ type: "GYRO", id: "phone-gyro", values });
    },
    [emit]
  );

  const throttledEmit = useThrottle(handleEmit, 30);

  useEffect(() => {
    if (!("DeviceOrientationEvent" in window)) {
      setSupported(false);
      return;
    }

    function onOrientation(e: DeviceOrientationEvent) {
      const values: GyroValues = {
        alpha: e.alpha ?? 0,
        beta: e.beta ?? 0,
        gamma: e.gamma ?? 0,
      };
      setGyro(values);
      throttledEmit(values);
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [throttledEmit]);

  const axes: { label: string; key: keyof GyroValues; range: number; unit: string }[] = [
    { label: "α Alpha", key: "alpha", range: 180, unit: "°" },
    { label: "β Beta",  key: "beta",  range: 90,  unit: "°" },
    { label: "γ Gamma", key: "gamma", range: 90,  unit: "°" },
  ];

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Gyroscope
        </span>
        {!supported && (
          <span className="text-xs text-red-400">Not supported</span>
        )}
      </div>

      {axes.map(({ label, key, range, unit }) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{label}</span>
            <span className="font-mono text-white">
              {clamp(gyro[key])}{unit}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-75"
              style={{ width: `${barPercent(gyro[key], range)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
