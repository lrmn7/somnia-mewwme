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
  | "playerState"
  | "queueUpdate";

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
      } catch (err) {
       // console.warn(`[BotWsService] Failed to parse message for guild ${guildId}:`, err);
      }
    });

    ws.on("close", () => {
     // console.info(`[BotWsService] WebSocket closed for guild ${guildId}, reconnecting in 3s`);
      if (!connections.has(guildId)) return;
      conn.reconnectTimer = setTimeout(() => {
        if (conn.handlers.size > 0) {
          console.info(`[BotWsService] Reconnecting guild ${guildId}`);
          openConnection(guildId, conn);
        }
      }, 3_000);
    });

    ws.on("error", (err) => {
     // console.warn(`[BotWsService] WebSocket error for guild ${guildId}:`, (err as Error).message);
    });
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
