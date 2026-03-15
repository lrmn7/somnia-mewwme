import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkTrack } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

const TrackAdd: MewslinkTrack[] = [];
const TrackExist: string[] = [];
let Result: MewslinkTrack[] | null = null;

export default class implements Command {
  public name = ["pl", "savequeue"];
  public description = "Save the current queue to a playlist";
  public category = "Playlist";
  public accessableby = data.COMMANDS_ACCESS.PLAYLIST.SaveQueue;
  public usage = "<playlist_id>";
  public aliases = ["pl-sq"];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "id",
      description: "The id of the playlist",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const value = handler.args[0] ? handler.args[0] : null;

    if (value == null)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_savequeue_invalid")}`
            )
            .setColor(client.color_main),
        ],
      });

    const playlist = await client.db.playlist.get(`${value}`);

    if (!playlist)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_savequeue_notfound")}`
            )
            .setColor(client.color_main),
        ],
      });
    if (playlist.owner !== handler.user?.id)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_savequeue_owner")}`
            )
            .setColor(client.color_main),
        ],
      });

    const player = client.mewslink.players.get(handler.guild!.id);

    const queue = player?.queue.map((track) => track);
    const current = player?.queue.current;

    if (queue?.length == 0 && !current)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_savequeue_no_tracks")}`
            )
            .setColor(client.color_main),
        ],
      });

    TrackAdd.push(current as MewslinkTrack);
    TrackAdd.push(...queue!);

    if (!playlist) Result = TrackAdd;

    if (playlist.tracks) {
      for (let i = 0; i < playlist.tracks.length; i++) {
        const element = playlist.tracks[i].uri;
        TrackExist.push(element);
      }
      Result = TrackAdd.filter((track) => !TrackExist.includes(String(track.uri)));
    }

    if (Result!.length == 0) {
      const embed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.playlist", "pl_savequeue_no_new_saved", {
            name: value,
          })}`
        )
        .setColor(client.color_main);
      return handler.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.playlist", "pl_savequeue_saved", {
          name: value,
          tracks: String(queue?.length! + 1),
        })}`
      )
      .setColor(client.color_main);
    await handler.editReply({ embeds: [embed] });

    Result!.forEach(async (track) => {
      await client.db.playlist.push(`${value}.tracks`, {
        title: track.title,
        uri: track.uri,
        length: track.duration,
        thumbnail: track.artworkUrl,
        author: track.author,
        requester: track.requester,
      });
    });

    TrackAdd.length = 0;
    TrackExist.length = 0;
    Result = null;
  }
}
