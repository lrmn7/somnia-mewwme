import { EmbedBuilder, ApplicationCommandOptionType, Message } from "discord.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { PageQueue } from "../../structures/PageQueue.js";
import { Manager } from "../../manager.js";
import { PlaylistTrack } from "../../database/schema/Playlist.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["pl", "detail"];
  public description = "View all your playlists";
  public category = "Playlist";
  public accessableby = data.COMMANDS_ACCESS.PLAYLIST.Detail;
  public usage = "<playlist_id> <number>";
  public aliases = [];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public options = [
    {
      name: "id",
      description: "The id of the playlist",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "page",
      description: "The page you want to view",
      required: false,
      type: ApplicationCommandOptionType.Integer,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const value = handler.args[0] ? handler.args[0] : null;
    const number = handler.args[1];

    if (number && isNaN(+number))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_detail_number_invalid")}`
            )
            .setColor(client.color_main),
        ],
      });

    if (!value)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_detail_notfound")}`
            )
            .setColor(client.color_main),
        ],
      });

    const playlist = await client.db.playlist.get(value!);

    if (!playlist)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_detail_notfound")}`
            )
            .setColor(client.color_main),
        ],
      });
    if (playlist.private && playlist.owner !== handler.user?.id)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_detail_private")}`
            )
            .setColor(client.color_main),
        ],
      });

    let pagesNum = Math.ceil(playlist.tracks!.length / 10);
    if (pagesNum === 0) pagesNum = 1;

    const playlistStrings = [];
    for (let i = 0; i < playlist.tracks!.length; i++) {
      const playlists = playlist.tracks![i];
      playlistStrings.push(
        `${client.i18n.get(handler.language, "commands.playlist", "pl_detail_track", {
          num: String(i + 1),
          title: this.getTitle(client, playlists),
          author: String(playlists.author),
          duration: new FormatDuration().parse(playlists.length),
        })}
                `
      );
    }

    const totalDuration = new FormatDuration().parse(
      playlist.tracks!.reduce((acc: number, cur: PlaylistTrack) => acc + cur.length!, 0)
    );

    const pages = [];
    for (let i = 0; i < pagesNum; i++) {
      const str = playlistStrings.slice(i * 10, i * 10 + 10).join(`\n`);
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${client.i18n.get(handler.language, "commands.playlist", "pl_detail_embed_title", {
            name: playlist.name,
          })}`,
          iconURL: handler.user?.displayAvatarURL(),
        })
        .setDescription(`${str == "" ? "  Nothing" : "\n" + str}`)
        .setColor(client.color_main)
        .setFooter({
          text: `${client.i18n.get(
            handler.language,
            "commands.playlist",
            "pl_detail_embed_footer",
            {
              page: String(i + 1),
              pages: String(pagesNum),
              songs: String(playlist.tracks!.length),
              duration: totalDuration,
            }
          )}`,
        });

      pages.push(embed);
    }
    if (!number) {
      if (pages.length == pagesNum && playlist.tracks!.length > 10) {
        if (handler.message) {
          await new PageQueue(
            client,
            pages,
            30000,
            playlist.tracks!.length,
            handler.language
          ).prefixPage(handler.message, totalDuration);
        } else if (handler.interaction) {
          await new PageQueue(
            client,
            pages,
            30000,
            playlist.tracks!.length,
            handler.language
          ).slashPage(handler.interaction, totalDuration);
        }
      } else return handler.editReply({ embeds: [pages[0]] });
    } else {
      if (isNaN(+number))
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, "commands.playlist", "pl_detail_notnumber")}`
              )
              .setColor(client.color_main),
          ],
        });
      if (Number(number) > pagesNum)
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(
                  handler.language,
                  "commands.playlist",
                  "pl_detail_page_notfound",
                  {
                    page: String(pagesNum),
                  }
                )}`
              )
              .setColor(client.color_main),
          ],
        });
      const pageNum = Number(number) == 0 ? 1 : Number(number) - 1;
      return handler.editReply({ embeds: [pages[pageNum]] });
    }
  }

  getTitle(client: Manager, tracks: PlaylistTrack): string {
    const title = tracks.title.length > 25 ? tracks.title.substring(0, 22) + "..." : tracks.title;
    const author = tracks.author;

    if (client.config.features.HIDE_LINK) {
      return `${title} by ${author}`;
    } else {
      const supportUrl = client.config.bot.SERVER_SUPPORT_URL;
      return `[${title} by ${author}](${supportUrl})`;
    }
  }
}
