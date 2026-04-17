import Fastify from "fastify";
import { Manager } from "../manager.js";
import { WebSocket } from "@fastify/websocket";

export class WebsocketRoute {
  constructor(protected client: Manager) {}

  main(fastify: Fastify.FastifyInstance) {
    fastify.get("/websocket", { websocket: true }, (socket, req) => {
      this.client.logger.info(WebsocketRoute.name, `${req.method} ${req.routeOptions.url}`);
      socket.on("close", (code, reason) => {
        this.client.logger.info(
          WebsocketRoute.name,
          `Closed with code: ${code}, reason: ${reason}`
        );
        this.client.wsl.delete(String(req.headers["guild-id"]));
      });
      if (!this.checker(socket, req)) return;
      this.client.wsl.set(String(req.headers["guild-id"]), {
        send: (data) => {
          try {
            if (socket.readyState === socket.OPEN) {
              socket.send(JSON.stringify(data));
            }
          } catch (err) {
            this.client.logger.warn(
              WebsocketRoute.name,
              `Failed to send to guild ${req.headers["guild-id"]}: ${String(err)}`
            );
          }
        },
      });
      this.client.logger.info(
        WebsocketRoute.name,
        `Websocket opened for guildId: ${req.headers["guild-id"]}`
      );
    });
  }

  checker(socket: WebSocket, req: Fastify.FastifyRequest) {
    if (!req.headers["guild-id"]) {
      socket.send(JSON.stringify({ error: "Missing guild-id" }));
      socket.close(1000, JSON.stringify({ error: "Missing guild-id" }));
      return false;
    }
    if (!req.headers["authorization"]) {
      socket.send(JSON.stringify({ error: "Missing Authorization" }));
      socket.close(1000, JSON.stringify({ error: "Missing Authorization" }));
      return false;
    }
    if (req.headers["authorization"] !== this.client.config.features.RestAPI.auth) {
      socket.send(JSON.stringify({ error: "Authorization failed" }));
      socket.close(1000, JSON.stringify({ error: "Authorization failed" }));
      return false;
    }
    if (this.client.wsl.get(String(req.headers["guild-id"]))) {
      this.client.logger.warn(
        WebsocketRoute.name,
        `Replacing stale WSL connection for guild ${req.headers["guild-id"]}`
      );
      this.client.wsl.delete(String(req.headers["guild-id"]));
    }
    return true;
  }
}
