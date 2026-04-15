import { useState } from "react";
import { motion } from "framer-motion";
import type { ControllerEvent } from "../hooks/useSocket";

interface ButtonConfig {
  id: string;
  label: string;
  color: string;
  glow: string;
}

const BUTTONS: ButtonConfig[] = [
  {
    id: "btn-a",
    label: "A",
    color: "bg-emerald-600 active:bg-emerald-500",
    glow: "shadow-emerald-900/70",
  },
  {
    id: "btn-b",
    label: "B",
    color: "bg-rose-600 active:bg-rose-500",
    glow: "shadow-rose-900/70",
  },
];

interface Props {
  emit: (event: ControllerEvent) => void;
}

export default function ActionButtons({ emit }: Props) {
  const [pressed, setPressed] = useState<Record<string, boolean>>({});

  function handlePress(id: string, isDown: boolean) {
    setPressed((prev) => ({ ...prev, [id]: isDown }));
    emit({ type: "BUTTON", id, values: isDown });
  }

  return (
    <div className="flex gap-5 justify-center">
      {BUTTONS.map((btn) => (
        <motion.button
          key={btn.id}
          onPointerDown={() => handlePress(btn.id, true)}
          onPointerUp={() => handlePress(btn.id, false)}
          onPointerLeave={() => pressed[btn.id] && handlePress(btn.id, false)}
          animate={
            pressed[btn.id]
              ? { scale: 0.88, opacity: 0.9 }
              : { scale: 1, opacity: 1 }
          }
          transition={{ type: "spring", stiffness: 700, damping: 30 }}
          className={`
            flex h-20 w-20 items-center justify-center rounded-full
            text-2xl font-black text-white shadow-xl
            ${btn.color} ${btn.glow}
            select-none outline-none
          `}
        >
          {btn.label}
        </motion.button>
      ))}
    </div>
  );
}
