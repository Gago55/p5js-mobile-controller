import { useRef } from "react";
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

  function valueFromPointer(e: React.PointerEvent): number {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }

  function update(e: React.PointerEvent) {
    if (!(e.buttons & 1)) return;
    const v = valueFromPointer(e);
    emit({ type: "SLIDER", id, values: v });

    // Direct DOM update — no re-render needed
    const el = trackRef.current;
    if (!el) return;
    (el.querySelector("[data-fill]")  as HTMLElement | null)?.style.setProperty("width", `${v * 100}%`);
    (el.querySelector("[data-thumb]") as HTMLElement | null)?.style.setProperty("left",  `${v * 100}%`);
  }

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    update(e);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {label}
        </span>
        <span className="text-xs font-mono text-gray-500">{id}</span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onDown}
        onPointerMove={update}
        className="relative h-10 w-full rounded-full bg-gray-800 touch-none cursor-pointer select-none"
      >
        <div
          data-fill
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-indigo-600"
          style={{ width: "50%" }}
        />
        <div
          data-thumb
          className="pointer-events-none absolute top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg ring-2 ring-indigo-500"
          style={{ left: "50%" }}
        />
      </div>
    </div>
  );
}
