import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["247"];
  public description = "24/7 in voice channel";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.TwentyFourSeven;
  public usage = "<enable> atau <disable>";
  public aliases = [];
  public lavalink = true;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public options = [
    {
      name: "type",
      description: "Choose enable or disable",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "Enable",
          value: "enable",
        },
        {
          name: "Disable",
          value: "disable",
        },
      ],
    },
  ];
  public playerCheck = false;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    let player = client.mewslink.players.get(handler.guild!.id);

    const value = handler.args[0];

    const reconnectBuilder = new AutoReconnectBuilderService(client, player);

    const data = await reconnectBuilder.execute(handler.guild?.id!);

    if (value === "disable") {
      if (!data.twentyfourseven) {
        const offAl = new EmbedBuilder()
          .setDescription(
            `${client.i18n.get(handler.language, "commands.settings", "247_already", {
              mode: handler.modeLang.disable,
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
            })}`
          )
          .setColor(client.color_main);
        return handler.editReply({ content: " ", embeds: [offAl] });
      }

      await client.db.autoreconnect.delete(`${handler.guild!.id}`);
      player ? player.data.set("sudo-destroy", true) : true;
      if (player && player.voiceId && !handler.member!.voice.channel) {
        player.destroy();
      }

      const on = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "247_off", {
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);
      handler.editReply({ content: " ", embeds: [on] });
    } else if (value === "enable") {
      const { channel } = handler.member!.voice;
      if (!channel) {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, "commands.settings", "247_no_in_voice", {
                  user: String(handler.user?.displayName || handler.user?.tag),
                  botname: client.user!.username || client.user!.displayName,
                })}`
              )
              .setColor(client.color_main),
          ],
        });
      }

      if (data.twentyfourseven) {
        const onAl = new EmbedBuilder()
          .setDescription(
            `${client.i18n.get(handler.language, "commands.settings", "247_already", {
              mode: handler.modeLang.enable,
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
            })}`
          )
          .setColor(client.color_main);
        return handler.editReply({ content: " ", embeds: [onAl] });
      }

      if (!player) {
        player = await client.mewslink.create({
          guildId: handler.guild!.id,
          voiceId: handler.member!.voice.channel!.id,
          textId: String(handler.channel?.id),
          shardId: handler.guild?.shardId ?? 0,
          deaf: true,
          mute: true,
          region: handler.member!.voice.channel!.rtcRegion ?? null,
          nodeName: (await client.mewslink.nodes.getLeastUsed()).options.name,
          volume: client.config.bot.DEFAULT_VOLUME ?? 50,
        });
      }

      await client.db.autoreconnect.set(`${handler.guild!.id}.twentyfourseven`, true);
      new AutoReconnectBuilderService(client, player).playerBuild(player?.guildId, true);

      const on = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "247_on", {
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);
      handler.editReply({ content: " ", embeds: [on] });
    } else {
      const onsome = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "247_arg_error", {
            text: "**enable** atau **disable**",
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);
      handler.editReply({ content: " ", embeds: [onsome] });
    }
  }
}
