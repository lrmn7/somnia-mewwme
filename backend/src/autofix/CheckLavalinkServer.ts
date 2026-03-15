import { Manager } from "../manager.js";
import { Headers } from "../@types/Lavalink.js";
import { GetLavalinkServer } from "./GetLavalinkServer.js";
import { MewslinkWebsocket } from "../mewslink/main.js";

export class CheckLavalinkServer {
  client: Manager;
  constructor(client: Manager, isLogEnable: boolean = true) {
    this.client = client;
    this.execute(isLogEnable);
  }

  async execute(isLogEnable: boolean) {
    if (isLogEnable)
      this.client.logger.info(
        CheckLavalinkServer.name,
        "Running check lavalink server for autofix"
      );

    const getLavalinkServerClass = new GetLavalinkServer();

    const lavalink_data = await getLavalinkServerClass.execute();

    if (this.client.lavalinkList.length !== 0) this.client.lavalinkList.length = 0;

    lavalink_data.forEach((config) => {
      let headers = {
        "Client-Name": "mewwme/10.0.0 (https://github.com/lrmn7/mewwme)",
        "User-Agent": "mewwme/10.0.0 (https://github.com/lrmn7/mewwme)",
        Authorization: config.pass,
        "User-Id": "176144329046360064",
        "Resume-Key": "mewwme@10.0.0(https://github.com/lrmn7/mewwme)",
      };

      const url = `ws://${config.host}:${config.port}/v4/websocket`;

      this.checkServerStatus(url, headers)
        .then(() => {
          this.client.lavalinkList.push({
            host: config.host,
            port: config.port,
            pass: config.pass,
            secure: config.secure,
            name: config.host,
            online: true,
          });
        })
        .catch(() => {
          this.client.lavalinkList.push({
            host: config.host,
            port: config.port,
            pass: config.pass,
            secure: config.secure,
            name: config.host,
            online: false,
          });
        });
    });
  }

  checkServerStatus(url: string, headers: Headers) {
    return new Promise((resolve, reject) => {
      const ws = new MewslinkWebsocket(url, { headers });
      ws.on("open", () => {
        resolve(true);
        ws.close();
      });
      ws.on("error", (e) => reject(e));
    });
  }
}
