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
 * Resolve the socket server URL.
 *
 * When served over HTTPS (required for Android gyro), browsers block
 * mixed-content connections to plain HTTP/WS. The Vite dev server proxies
 * /socket.io/* → localhost:3001, so we connect to the same origin (no port 3001).
 *
 * On plain HTTP desktop dev, we fall back to localhost:3001 directly.
 */
function resolveServerUrl(): string {
  const { protocol, hostname, port } = window.location;
  if (protocol === "https:") {
    // Use the same HTTPS origin — Vite proxy forwards /socket.io/* to the bridge
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }
  // Plain HTTP (desktop only) — connect directly to the bridge server port
  const envUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
  return envUrl ?? `http://${hostname}:3001`;
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
