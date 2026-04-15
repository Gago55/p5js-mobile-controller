import { useState } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import GyroscopePanel from "./GyroscopePanel";
import VirtualJoystick from "./VirtualJoystick";
import ControlSlider from "./ControlSlider";
import type { ControllerEvent } from "../hooks/useSocket";

// ── Types ────────────────────────────────────────────────────────────────────

export type TabId = "gyro" | "buttons" | "sliders" | "joysticks";

export interface ControlItem {
  id: string;
  label: string;
}

interface Props {
  emit: (event: ControllerEvent) => void;
  defaultTab?: TabId;
  // dynamic control lists
  buttons:   ControlItem[];
  sliders:   ControlItem[];
  joysticks: ControlItem[];
  // add / remove callbacks
  onAddButton:      () => void;
  onRemoveButton:   (id: string) => void;
  onAddSlider:      () => void;
  onRemoveSlider:   (id: string) => void;
  onAddJoystick:    () => void;
  onRemoveJoystick: (id: string) => void;
  // layout hint
  compact?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_BUTTONS   = 8;
export const MAX_SLIDERS   = 8;
export const MAX_JOYSTICKS = 4;

const BTN_LABELS = "ABCDEFGH";

const BTN_COLORS = [
  { bg: "bg-emerald-600 active:bg-emerald-500", glow: "shadow-emerald-900/60" },
  { bg: "bg-rose-600    active:bg-rose-500",    glow: "shadow-rose-900/60"    },
  { bg: "bg-blue-600    active:bg-blue-500",    glow: "shadow-blue-900/60"    },
  { bg: "bg-purple-600  active:bg-purple-500",  glow: "shadow-purple-900/60"  },
  { bg: "bg-amber-500   active:bg-amber-400",   glow: "shadow-amber-900/60"   },
  { bg: "bg-cyan-600    active:bg-cyan-500",    glow: "shadow-cyan-900/60"    },
  { bg: "bg-pink-600    active:bg-pink-500",    glow: "shadow-pink-900/60"    },
  { bg: "bg-teal-600    active:bg-teal-500",    glow: "shadow-teal-900/60"    },
];

// ── SVG tab icons ────────────────────────────────────────────────────────────

function IconGyro() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconButtons() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <circle cx="7"  cy="7"  r="3.5" />
      <circle cx="17" cy="7"  r="3.5" />
      <circle cx="7"  cy="17" r="3.5" />
      <circle cx="17" cy="17" r="3.5" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <line x1="3" y1="6"  x2="21" y2="6"  strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
      <circle cx="8"  cy="6"  r="2.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="9"  cy="18" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconJoystick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <line x1="12" y1="3"  x2="12" y2="8.5" strokeLinecap="round" />
      <line x1="12" y1="15.5" x2="12" y2="21" strokeLinecap="round" />
      <line x1="3"  y1="12" x2="8.5" y2="12" strokeLinecap="round" />
      <line x1="15.5" y1="12" x2="21" y2="12" strokeLinecap="round" />
    </svg>
  );
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "gyro",      label: "Gyro",    icon: <IconGyro />     },
  { id: "buttons",   label: "Buttons", icon: <IconButtons />  },
  { id: "sliders",   label: "Sliders", icon: <IconSliders />  },
  { id: "joysticks", label: "Sticks",  icon: <IconJoystick /> },
];

// ── Shared add / remove bar ──────────────────────────────────────────────────

function AddRemoveBar({
  onAdd, addDisabled, onRemoveLast, removeDisabled, label,
}: {
  onAdd: () => void;
  addDisabled: boolean;
  onRemoveLast: () => void;
  removeDisabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex gap-2">
        <button
          onClick={onRemoveLast}
          disabled={removeDisabled}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800 text-gray-400 disabled:opacity-30 active:bg-gray-700"
        >
          <span className="text-lg leading-none mb-0.5">−</span>
        </button>
        <button
          onClick={onAdd}
          disabled={addDisabled}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-700 text-white disabled:opacity-30 active:bg-indigo-600"
        >
          <span className="text-lg leading-none mb-0.5">+</span>
        </button>
      </div>
    </div>
  );
}

// ── Panel component ──────────────────────────────────────────────────────────

export default function Panel({
  emit,
  defaultTab = "gyro",
  buttons, sliders, joysticks,
  onAddButton, onRemoveButton,
  onAddSlider, onRemoveSlider,
  onAddJoystick, onRemoveJoystick,
  compact = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  // ── Button press handling ────────────────────────────────────────────────
  function btnDown(id: string) {
    setPressed((s) => new Set([...s, id]));
    emit({ type: "BUTTON", id, values: true });
  }
  function btnUp(id: string) {
    setPressed((s) => { const n = new Set(s); n.delete(id); return n; });
    emit({ type: "BUTTON", id, values: false });
  }

  // ── Tab content ─────────────────────────────────────────────────────────
  function renderContent() {
    switch (activeTab) {

      // ── GYRO ──────────────────────────────────────────────────────────────
      case "gyro":
        return (
          <div className="p-3 overflow-y-auto h-full">
            <GyroscopePanel emit={emit} />
          </div>
        );

      // ── BUTTONS ───────────────────────────────────────────────────────────
      case "buttons": {
        const btnSize = compact ? "h-16 w-16 text-xl" : "h-20 w-20 text-2xl";
        return (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <AddRemoveBar
              label={`${buttons.length} / ${MAX_BUTTONS} buttons`}
              onAdd={onAddButton}
              addDisabled={buttons.length >= MAX_BUTTONS}
              onRemoveLast={() => onRemoveButton(buttons[buttons.length - 1].id)}
              removeDisabled={buttons.length <= 1}
            />
            <div className="flex flex-wrap gap-4 justify-center items-center flex-1">
              {buttons.map((btn, i) => {
                const color = BTN_COLORS[i % BTN_COLORS.length];
                const isPressed = pressed.has(btn.id);
                return (
                  <motion.button
                    key={btn.id}
                    onPointerDown={() => btnDown(btn.id)}
                    onPointerUp={() => btnUp(btn.id)}
                    onPointerLeave={() => { if (isPressed) btnUp(btn.id); }}
                    animate={isPressed ? { scale: 0.88, opacity: 0.85 } : { scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className={`
                      flex flex-col items-center justify-center rounded-full
                      font-black text-white shadow-xl select-none outline-none
                      ${btnSize} ${color.bg} ${color.glow}
                    `}
                  >
                    <span>{BTN_LABELS[i] ?? i + 1}</span>
                    <span className="text-[9px] font-mono opacity-50 mt-0.5">{btn.id}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      }

      // ── SLIDERS ───────────────────────────────────────────────────────────
      case "sliders":
        return (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <AddRemoveBar
              label={`${sliders.length} / ${MAX_SLIDERS} sliders`}
              onAdd={onAddSlider}
              addDisabled={sliders.length >= MAX_SLIDERS}
              onRemoveLast={() => onRemoveSlider(sliders[sliders.length - 1].id)}
              removeDisabled={sliders.length <= 1}
            />
            <div className="flex flex-col gap-4">
              {sliders.map((s) => (
                <ControlSlider key={s.id} id={s.id} label={s.label} emit={emit} />
              ))}
            </div>
          </div>
        );

      // ── JOYSTICKS ─────────────────────────────────────────────────────────
      case "joysticks":
        return (
          <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
            <AddRemoveBar
              label={`${joysticks.length} / ${MAX_JOYSTICKS} sticks`}
              onAdd={onAddJoystick}
              addDisabled={joysticks.length >= MAX_JOYSTICKS}
              onRemoveLast={() => onRemoveJoystick(joysticks[joysticks.length - 1].id)}
              removeDisabled={joysticks.length <= 1}
            />
            <div className="flex flex-wrap gap-4 justify-center items-center flex-1">
              {joysticks.map((j) => (
                <VirtualJoystick key={j.id} id={j.id} label={j.label} emit={emit} />
              ))}
            </div>
          </div>
        );
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="h-full"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Tab bar (bottom of panel) ────────────────────────────────────── */}
      <div className="flex border-t border-gray-800 bg-gray-950 shrink-0">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-colors
                ${active ? "text-indigo-400" : "text-gray-600 hover:text-gray-400"}
              `}
            >
              {tab.icon}
              <span className="text-[9px] font-semibold uppercase tracking-wider">
                {tab.label}
              </span>
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 h-0.5 w-8 bg-indigo-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
