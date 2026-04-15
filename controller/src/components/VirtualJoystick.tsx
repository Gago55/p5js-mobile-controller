import { useRef, useCallback } from "react";
import { useThrottle } from "../hooks/useThrottle";
import type { ControllerEvent } from "../hooks/useSocket";

interface Props {
  id?: string;
  label?: string;
  emit: (event: ControllerEvent) => void;
}

// Half the container size in px (container is 144px = h-36/w-36)
const TRACK_RADIUS = 54;

export default function VirtualJoystick({
  id = "joystick-left",
  label = "Move",
  emit,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });

  const handleEmit = useCallback(
    (values: { x: number; y: number }) => emit({ type: "JOYSTICK", id, values }),
    [emit, id]
  );
  const throttledEmit = useThrottle(handleEmit, 150);

  /** Move knob DOM node directly — no re-render needed */
  function moveKnob(dx: number, dy: number) {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (activeId.current !== null) return; // one touch only
    activeId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId); // keep events even if finger leaves zone

    const rect = containerRef.current!.getBoundingClientRect();
    center.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activeId.current) return;

    const rawDx = e.clientX - center.current.x;
    const rawDy = e.clientY - center.current.y;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    // Clamp to track radius
    const scale = dist > TRACK_RADIUS ? TRACK_RADIUS / dist : 1;
    const dx = rawDx * scale;
    const dy = rawDy * scale;

    moveKnob(dx, dy);
    throttledEmit({
      x: parseFloat((dx / TRACK_RADIUS).toFixed(3)),
      y: parseFloat((-dy / TRACK_RADIUS).toFixed(3)), // invert Y so up = positive
    });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    moveKnob(0, 0);
    emit({ type: "JOYSTICK", id, values: { x: 0, y: 0 } });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </span>

      {/* Zone */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative flex h-36 w-36 items-center justify-center rounded-full bg-gray-900 border border-gray-700 touch-none select-none cursor-none"
      >
        {/* Guide ring */}
        <div className="absolute h-24 w-24 rounded-full border border-gray-700/40" />

        {/* Crosshair */}
        <div className="absolute h-px w-24 bg-gray-800" />
        <div className="absolute h-24 w-px bg-gray-800" />

        {/* Knob — positioned at centre, moved by transform */}
        <div
          ref={knobRef}
          className="absolute h-12 w-12 rounded-full bg-indigo-500 shadow-lg shadow-indigo-900/60 pointer-events-none"
          style={{ transform: "translate(0px, 0px)" }}
        />
      </div>
    </div>
  );
}
