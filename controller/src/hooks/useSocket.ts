import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export type ControlType = "JOYSTICK" | "BUTTON" | "GYRO" | "SLIDER";

export interface ControllerEvent {
  type: ControlType;
  id: string;
  values: unknown;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";

export function useSocket(roomId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("JOIN_ROOM", { roomId, role: "controller" });
    });

    socket.on("ERROR", ({ message }: { message: string }) => {
      console.warn("[socket error]", message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const emit = useCallback((event: ControllerEvent) => {
    socketRef.current?.emit("CONTROLLER_EVENT", event);
  }, []);

  return { emit, socketRef };
}
