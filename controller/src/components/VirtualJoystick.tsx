import { useEffect, useRef, useCallback } from "react";
import nipplejs from "nipplejs";
import { useThrottle } from "../hooks/useThrottle";
import type { ControllerEvent } from "../hooks/useSocket";

interface Props {
  id?: string;
  label?: string;
  emit: (event: ControllerEvent) => void;
}

export default function VirtualJoystick({
  id = "joystick-left",
  label = "Move",
  emit,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEmit = useCallback(
    (values: { x: number; y: number }) => {
      emit({ type: "JOYSTICK", id, values });
    },
    [emit, id]
  );

  const throttledEmit = useThrottle(handleEmit, 30);

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = nipplejs.create({
      zone: containerRef.current,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "#6366f1",
      size: 120,
      restOpacity: 0.9,
      fadeTime: 150,
    });

    manager.on("move", (_evt: unknown, data) => {
      const angle = data.angle?.radian ?? 0;
      const force = Math.min(1, data.force ?? 0);
      throttledEmit({
        x: parseFloat((Math.cos(angle) * force).toFixed(3)),
        y: parseFloat((Math.sin(angle) * force).toFixed(3)),
      });
    });

    manager.on("end", () => {
      emit({ type: "JOYSTICK", id, values: { x: 0, y: 0 } });
    });

    return () => {
      manager.destroy();
    };
  }, [throttledEmit, emit, id]);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <div
        ref={containerRef}
        className="relative h-36 w-36 rounded-full bg-gray-900 border border-gray-700 touch-none"
      />
    </div>
  );
}
