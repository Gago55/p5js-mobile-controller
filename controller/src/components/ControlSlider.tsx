import { useRef } from "react";
import { motion } from "framer-motion";
import type { ControllerEvent } from "../hooks/useSocket";

interface Props {
  id?: string;
  label?: string;
  emit: (event: ControllerEvent) => void;
}

export default function ControlSlider({
  id = "slider-main",
  label = "Precision",
  emit,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(0.5);

  function getValueFromPointer(e: React.PointerEvent): number {
    const rect = trackRef.current!.getBoundingClientRect();
    const raw = (e.clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, raw));
  }

  function handleMove(e: React.PointerEvent) {
    if (!(e.buttons & 1)) return; // only when primary button held
    const v = getValueFromPointer(e);
    valueRef.current = v;
    emit({ type: "SLIDER", id, values: v });

    // Update thumb visually without re-render via direct DOM
    const thumb = trackRef.current?.querySelector<HTMLDivElement>("[data-thumb]");
    const fill = trackRef.current?.querySelector<HTMLDivElement>("[data-fill]");
    if (thumb) thumb.style.left = `${v * 100}%`;
    if (fill) fill.style.width = `${v * 100}%`;
  }

  function handleDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMove(e);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {label}
        </span>
        <span className="text-xs font-mono text-gray-400" id={`${id}-label`}>
          50%
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        className="relative h-10 w-full rounded-full bg-gray-800 touch-none cursor-pointer select-none"
      >
        {/* Fill */}
        <div
          data-fill
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-indigo-600"
          style={{ width: "50%" }}
        />

        {/* Thumb */}
        <motion.div
          data-thumb
          className="pointer-events-none absolute top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg ring-2 ring-indigo-500"
          style={{ left: "50%" }}
        />
      </div>
    </div>
  );
}
