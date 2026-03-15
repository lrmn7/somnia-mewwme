import WebSocket from "ws";

export type WSOpCode =
  | "playerCreate"
  | "playerDestroy"
  | "playerPause"
  | "playerResume"
  | "playerUpdate"
  | "trackStart"
  | "playerEnd"
  | "memberJoin"
  | "memberLeave"
  // Emitted after any dashboard control mutation (loop, volume, queue add, seek)
  // so the frontend can apply a full partial-state patch without polling.
  | "playerState";

export interface WSTrackData {
  title: string;
  uri: string;
  length: number;
  thumbnail: string | null;
  author: string;
  requester:
    | string
    | null
    | { id: string; username: string; globalName: string | null; defaultAvatarURL: string | null };
}

export interface WSMessage {
  op: WSOpCode;
  guild: string;
  position?: number;
  data?: WSTrackData;
  userId?: string;
  mode?: string;
  // ── playerState payload fields ─────────────────────────────────────────────
  loop?: string;
  pause?: boolean;
  volume?: number;
  current?: WSTrackData | null;
  queue?: WSTrackData[];
}

type MessageHandler = (data: WSMessage) => void;

interface GuildConnection {
  ws: WebSocket;
  handlers: Set<MessageHandler>;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

export function createBotWsService(wsBaseUrl: string, apiToken: string) {
  const connections = new Map<string, GuildConnection>();

  function openConnection(guildId: string, conn: GuildConnection): void {
    const ws = new WebSocket(`${wsBaseUrl}/v1/websocket`, {
      headers: { authorization: apiToken, "guild-id": guildId },
    });
    conn.ws = ws;

    // console.info(`[BotWsService] openConnection -> guild=${guildId} time=${Date.now()}`);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSMessage;
        for (const handler of conn.handlers) handler(msg);
      } catch {}
    });

    ws.on("close", () => {
      // console.info(`[BotWsService] close -> guild=${guildId} time=${Date.now()}`);
      if (!connections.has(guildId)) return;
      conn.reconnectTimer = setTimeout(() => {
        if (conn.handlers.size > 0) openConnection(guildId, conn);
      }, 3_000);
    });

    ws.on("error", () => {});
  }

  return {
    subscribe(guildId: string, handler: MessageHandler): void {
      if (!connections.has(guildId)) {
        const conn: GuildConnection = { ws: null as any, handlers: new Set() };
        connections.set(guildId, conn);
        openConnection(guildId, conn);
      }
      connections.get(guildId)!.handlers.add(handler);
    },

    unsubscribe(guildId: string, handler: MessageHandler): void {
      const conn = connections.get(guildId);
      if (!conn) return;
      conn.handlers.delete(handler);
      if (conn.handlers.size === 0) {
        clearTimeout(conn.reconnectTimer);
        connections.delete(guildId);
        try {
          conn.ws.close();
        } catch {}
      }
    },
  };
}
