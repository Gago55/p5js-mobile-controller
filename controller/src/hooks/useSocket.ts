import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

export type ControlType = "JOYSTICK" | "BUTTON" | "GYRO" | "SLIDER";

export interface ControllerEvent {
  type: ControlType;
  id: string;
  values: unknown;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Resolve the server URL at runtime so that phones on the LAN automatically
 * reach the right machine instead of pointing at their own localhost.
 *
 * Priority:
 *  1. VITE_SOCKET_URL env var (if explicitly set to something other than localhost)
 *  2. Same hostname that served this page + port 3001
 */
function resolveServerUrl(): string {
  const envUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  // Use the same host the browser used to reach Vite — works on any device on the LAN
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3001`;
}

const SOCKET_URL = resolveServerUrl();

export function useSocket(roomId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    if (!roomId) return;

    setStatus("connecting");
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("JOIN_ROOM", { roomId, role: "controller" });
    });

    socket.on("disconnect", () => setStatus("disconnected"));

    socket.on("connect_error", () => setStatus("error"));

    socket.on("ERROR", ({ message }: { message: string }) => {
      console.warn("[socket error]", message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setStatus("disconnected");
    };
  }, [roomId]);

  const emit = useCallback((event: ControllerEvent) => {
    socketRef.current?.emit("CONTROLLER_EVENT", event);
  }, []);

  return { emit, socketRef, status, serverUrl: SOCKET_URL };
}
