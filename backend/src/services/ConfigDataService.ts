import { load } from "js-yaml";
import { YAMLParseService } from "./YAMLParseService.js";
import { config } from "dotenv";
import { Config } from "../@types/Config.js";
config();

export class ConfigDataService {
  get data() {
    const yaml_files = load(new YAMLParseService("./config.yml").execute()) as Config;
    const old_data = load(new YAMLParseService("./config.yml").execute()) as Config;

    const res = yaml_files;

    if (old_data.features && old_data.features.DATABASE && old_data.features.DATABASE.config) {
      res.features.DATABASE.config = old_data.features.DATABASE.config;
    }

    // ── RestAPI env overrides (.env takes priority over config.yml) ──────────
    if (process.env.RESTAPI_AUTH) {
      res.features.RestAPI.auth = process.env.RESTAPI_AUTH;
    }
    if (process.env.RESTAPI_PORT) {
      res.features.RestAPI.port = Number(process.env.RESTAPI_PORT);
    }

    if (process.env.DOCKER_COMPOSE_MODE) {
      // Change lavalink data
      const lavalink_changedata = res.lavalink.NODES[0];
      lavalink_changedata.host = String(process.env.NODE_HOST);
      lavalink_changedata.port = Number(process.env.NODE_PORT);
      lavalink_changedata.name = "node_1";
      lavalink_changedata.auth = String(process.env.NODE_AUTH);
      lavalink_changedata.secure = false;

      if (process.env.DOCKER_COMPOSE_DATABASE) {
        // Change db data
        const db_chnagedata = res.features.DATABASE;
        if (db_chnagedata.driver == "mongodb") {
          db_chnagedata.config.uri = String(process.env.MONGO_URI);
        }
      }
    }

    return res;
  }

  checkConfig(res?: Config) {
    if (!res)
      throw new Error(
        "Config file not contains any config, please check config.example.yml for example"
      );
    if (!res.bot)
      throw new Error(
        "Config file not contains bot config field, please check config.example.yml for example"
      );
    if (!res.lavalink)
      throw new Error(
        "Config file not contains lavalink config field, please check config.example.yml for example"
      );
    if (!res.bot.OWNER_ID)
      throw new Error(
        "Config file not contains OWNER_ID, please check config.example.yml for example"
      );
    if (!res.bot.TOKEN || res.bot.TOKEN.length == 0)
      throw new Error(
        "Config file not contains TOKEN, please check config.example.yml for example"
      );
    if (!Array.isArray(res.bot.TOKEN))
      throw new Error("TOKEN field not in array, please check config.example.yml for example");
    if (!res.lavalink.NODES || res.lavalink.NODES.length == 0)
      throw new Error(
        "Config file not contains NODES, please check config.example.yml for example"
      );
  }

  // Modded from:
  // https://github.com/shipgirlproject/Shoukaku/blob/2677ecdf123ffef1c254c2113c5342b250ac4396/src/Utils.ts#L9-L23
  mergeDefault<T extends { [key: string]: any }>(def: T, given: T): Required<T> {
    if (!given) return def as Required<T>;
    const defaultKeys: (keyof T)[] = Object.keys(def);
    for (const key in given) {
      if (defaultKeys.includes(key)) continue;
      if (this.isNumber(key)) continue;
      delete given[key];
    }
    for (const key of defaultKeys) {
      if (Array.isArray(given[key]) && given[key].length == 0) given[key] = def[key];
      if (def[key] === null || (typeof def[key] === "string" && def[key].length === 0)) {
        if (!given[key]) given[key] = def[key];
      }
      if (given[key] === null || given[key] === undefined) given[key] = def[key];
      if (typeof given[key] === "object" && given[key] !== null) {
        this.mergeDefault(def[key], given[key]);
      }
      if (typeof given[key] !== typeof def[key]) if (!given[key]) given[key] = def[key];
    }
    return given as Required<T>;
  }

  isNumber(data: string): boolean {
    return /^[+-]?\d+(\.\d+)?$/.test(data);
  }
}
