import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["lyrics"];
  public description = "Display lyrics of the song";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Lyrics;
  public usage = "";
  public aliases = ["ly"];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "search",
      description: "The song name",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    let query = handler.args.join(" ");
    if (!query) {
      const player = client.mewslink.players.get(String(handler.guild?.id));
      if (player && player.queue.current) {
        query = player.queue.current.author
          ? `${player.queue.current.title} ${player.queue.current.author}`
          : player.queue.current.title;
      } else {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                client.i18n.get(handler.language, "commands.music", "lyrics_noquery", {
                  user: handler.user.username,
                  botname: client.user!.username,
                })
              )
              .setColor(client.color_main),
          ],
        });
      }
    }

    try {
      const url = `https://lyrics.meww.me/youtube/lyrics?title=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();

      if (!result || !result.lyrics) {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                client.i18n.get(handler.language, "commands.music", "lyrics_notfound", {
                  user: handler.user.username,
                  botname: client.user!.username,
                })
              )
              .setColor(client.color_main),
          ],
        });
      }

      const lyrics = result.lyrics;
      const embed = new EmbedBuilder().setColor(client.color_second).setTitle(
        client.i18n.get(handler.language, "commands.music", "lyrics_title", {
          song: query,
        })
      );

      if (lyrics.length > 4096) {
        embed.setDescription(
          client.i18n.get(handler.language, "commands.music", "lyrics_toolong", {
            url: result.url ? result.url : "URL not available",
          })
        );
      } else {
        embed.setDescription(lyrics);
      }

      return handler.editReply({ embeds: [embed] });
    } catch (error: any) {
      client.logger.error("LyricsCommand Error:", error);
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              client.i18n.get(handler.language, "commands.music", "lyrics_error", {
                user: handler.user.username,
                botname: client.user!.username,
                error: error.message,
              })
            )
            .setColor(client.color_main),
        ],
      });
    }
  }
}
