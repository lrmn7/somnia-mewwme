import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkLoopMode, MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["loop"];
  public description = "Loop song in queue type all/current!";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Loop;
  public usage = "<mode>";
  public aliases = [];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [
    {
      name: "type",
      description: "Type of loop",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "Song",
          value: "song",
        },
        {
          name: "Queue",
          value: "queue",
        },
        {
          name: "None",
          value: "none",
        },
      ],
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const player = client.mewslink.players.get(handler.guild!.id) as MewslinkPlayer;
    const currentTrack = player.queue.current;

    if (!currentTrack) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "no_songs_playing", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    const mode_array = ["song", "queue", "none"];

    const mode = handler.args[0];

    if (!mode_array.includes(mode))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "loop_invalid", {
                mode: this.changeBold(mode_array).join(", "),
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if ((mode == "song" && player.loop == MewslinkLoopMode.SONG) || mode == player.loop)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "loop_already", {
                mode: mode,
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (mode == "song") {
      player.setLoop(MewslinkLoopMode.SONG);
      if (client.config.features.AUTO_RESUME)
        this.setLoop247(client, player, MewslinkLoopMode.SONG);

      const looped = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "loop_current", {
            user: handler.user!.displayName || handler.user!.tag,
            title: this.getTitle(client, currentTrack),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);
      handler.editReply({ content: " ", embeds: [looped] });
    } else if (mode == "queue") {
      player.setLoop(MewslinkLoopMode.QUEUE);
      if (client.config.features.AUTO_RESUME)
        this.setLoop247(client, player, MewslinkLoopMode.QUEUE);

      const looped_queue = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "loop_all", {
            user: handler.user!.displayName || handler.user!.tag,
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);
      handler.editReply({ content: " ", embeds: [looped_queue] });
    } else if (mode === "none") {
      player.setLoop(MewslinkLoopMode.NONE);
      if (client.config.features.AUTO_RESUME)
        this.setLoop247(client, player, MewslinkLoopMode.NONE);

      const looped = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "unloop_all", {
            user: handler.user!.displayName || handler.user!.tag,
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);
      handler.editReply({ content: " ", embeds: [looped] });
    }

    client.wsl.get(handler.guild!.id)?.send({
      op: "playerLoop",
      guild: handler.guild!.id,
      mode: mode,
    });
  }

  async setLoop247(client: Manager, player: MewslinkPlayer, loop: string) {
    const data = await new AutoReconnectBuilderService(client, player).execute(player.guildId);
    if (data) {
      await client.db.autoreconnect.set(`${player.guildId}.config.loop`, loop);
    }
  }

  changeBold(arrayMode: string[]) {
    const res = [];
    for (const data of arrayMode) {
      res.push(`**${data}**`);
    }
    return res;
  }

  getTitle(client: Manager, tracks: MewslinkTrack): string {
    const title = truncateString(tracks.title, 25);
    const author = truncateString(tracks.author, 15);
    const supportUrl = client.config.bot.SERVER_SUPPORT_URL;

    if (new FormatDuration().parse(tracks.duration) === "Live Stream") {
      return `${author}`;
    }

    if (client.config.features.HIDE_LINK) {
      return `\`${title}\` by \`${author}\``;
    } else if (client.config.features.REPLACE_LINK) {
      return `[\`${title}\`](${supportUrl}) by \`${author}\``;
    } else {
      return `[\`${title}\`](${tracks.uri || supportUrl}) by \`${author}\``;
    }
  }
}
