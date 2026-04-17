import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { BACKEND_URL } from "@/lib/config";

export function useSocket(guildId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!guildId || guildId === "null" || guildId === "undefined") return;

    const s = io(BACKEND_URL, {
      withCredentials: true,
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2_000,
    });
    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      s.emit("subscribe", guildId);
    });

    s.on("disconnect", () => setConnected(false));

    s.on("connect_error", (err) => {
      console.error("[Socket] connect error:", err.message);
    });

    s.io.on("reconnect", () => {
      s.emit("subscribe", guildId);
      s.emit("requestState");
    });

    return () => {
      s.emit("unsubscribe");
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [guildId]);

  return { socket, connected };
}
