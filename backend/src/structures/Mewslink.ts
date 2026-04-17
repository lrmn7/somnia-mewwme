import { Manager } from "../manager.js";
import {
  Library,
  Plugin,
  Mewslink,
  MewslinkAdditionalOptions,
  MewslinkPlugin,
} from "../mewslink/main.js";

export class MewslinkInit {
  client: Manager;
  constructor(client: Manager) {
    this.client = client;
  }

  get init(): Mewslink {
    return new Mewslink({
      library: new Library.DiscordJS(this.client),
      nodes: this.client.config.lavalink.NODES,
      plugins: this.plugins,
      options: this.client.config.features.AUTOFIX_LAVALINK.enable
        ? this.autofixConfig
        : this.defaultConfig,
    });
  }

  get defaultConfig(): MewslinkAdditionalOptions {
    return {
      resume: true,
      resumeTimeout: 600,
      retryCount: Infinity,
      defaultSearchEngine: "spotify",
      retryTimeout: 3000,
      searchFallback: {
        enable: true,
        engine: "youtube",
      },
    };
  }

  get autofixConfig(): MewslinkAdditionalOptions {
    return {
      retryCount: this.client.config.features.AUTOFIX_LAVALINK.retryCount,
      retryTimeout: this.client.config.features.AUTOFIX_LAVALINK.retryTimeout,
      defaultSearchEngine: this.client.config.features.AUTOFIX_LAVALINK.defaultSearchEngine,
    };
  }

  get plugins(): MewslinkPlugin[] {
    const defaultPlugins: MewslinkPlugin[] = [
      new Plugin.Deezer(),
      new Plugin.Nico({ searchLimit: 10 }),
      new Plugin.Apple({ countryCode: "us", logger: this.client.logger }),
    ];

    if (this.client.config.features.CONVERT_LINK.Enable)
      defaultPlugins.push(
        new Plugin.YoutubeConverter({
          sources: [this.client.config.features.CONVERT_LINK.Engine || "scsearch"],
        })
      );

    if (this.client.config.lavalink.SPOTIFY.enable)
      defaultPlugins.push(
        new Plugin.Spotify({
          clientId: this.client.config.lavalink.SPOTIFY.id,
          clientSecret: this.client.config.lavalink.SPOTIFY.secret,
          clients: this.client.config.lavalink.SPOTIFY.clients?.map((c) => ({
            clientId: c.id,
            clientSecret: c.secret,
          })),
          playlistPageLimit: 1,
          albumPageLimit: 1,
          searchLimit: 10,
        })
      );

    return defaultPlugins;
  }
}
