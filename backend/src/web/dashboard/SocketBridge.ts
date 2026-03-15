import type { Server as SocketIOServer, Socket } from "socket.io";
import type { WSMessage } from "./BotWsService.js";
import type { AxiosInstance } from "axios";

type BotWsService = ReturnType<typeof import("./BotWsService.js").createBotWsService>;

export class SocketBridge {
  private subscriptions = new Map<string, { guildId: string; handler: (m: WSMessage) => void }>();

  constructor(
    private io: SocketIOServer,
    private botWs: BotWsService,
    private botApi: AxiosInstance
  ) {
    this.setup();
  }

  private setup(): void {
    this.io.on("connection", (socket: Socket) => {
      socket.on("subscribe", async (guildId: string) => {
        if (typeof guildId !== "string" || !/^\d{17,20}$/.test(guildId)) return;
        this.unsubscribeSocket(socket.id);

        const room = `guild:${guildId}`;
        socket.join(room);

        const handler = (msg: WSMessage) => {
          this.io.to(room).emit(msg.op, { ...msg, _guild: guildId });
        };

        this.botWs.subscribe(guildId, handler);
        this.subscriptions.set(socket.id, { guildId, handler });
        socket.emit("subscribed", { guildId });

        // Emit current player state immediately (if available) so UI doesn't
        // remain empty until the next realtime event arrives.
        try {
          const { data } = await this.botApi.get(`/players/${guildId}`);
          this.io.to(room).emit("playerCreate", data);
        } catch {
          /* ignore: no active player or permission error */
        }
      });

      // Let clients explicitly request an authoritative state snapshot.
      // Used on visibility-change or as a fallback when REST is unavailable.
      socket.on("requestState", async () => {
        const sub = this.subscriptions.get(socket.id);
        if (!sub) return;
        try {
          const { data } = await this.botApi.get(`/players/${sub.guildId}`);
          socket.emit("playerState", { ...data, _guild: sub.guildId });
        } catch {
          /* no active player or error — ignore */
        }
      });

      socket.on("unsubscribe", () => this.unsubscribeSocket(socket.id));
      socket.on("disconnect", () => this.unsubscribeSocket(socket.id));
    });
  }

  private unsubscribeSocket(socketId: string): void {
    const sub = this.subscriptions.get(socketId);
    if (!sub) return;
    this.io.sockets.sockets.get(socketId)?.leave(`guild:${sub.guildId}`);
    this.botWs.unsubscribe(sub.guildId, sub.handler);
    this.subscriptions.delete(socketId);
  }
}
