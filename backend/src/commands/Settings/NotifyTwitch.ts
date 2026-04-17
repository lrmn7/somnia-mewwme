import {
  ApplicationCommandOptionType,
  CommandInteractionOptionResolver,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { Manager } from "../../manager.js";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";

const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["notify", "twitch"];
  public description = "Manage Twitch stream notifications";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.NotifyTwitch;
  public usage = "";
  public aliases = [];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "action",
      description: "Choose to add or remove notification",
      required: true,
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
      ],
    },
    {
      name: "username",
      description: "The username of the Twitch streamer",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "channel",
      description: "The channel you want to send the message in (only for adding)",
      required: false,
      type: ApplicationCommandOptionType.Channel,
    },
    {
      name: "content",
      description:
        "The content displayed in the message. Mention roles you want to ping (only for adding)",
      required: false,
      type: ApplicationCommandOptionType.String,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    await handler.deferReply();
    // @ts-ignore
    const options = handler.interaction.options as CommandInteractionOptionResolver;
    const action = options.getString("action");
    const TwitchUsername = options.getString("username");
    const channel = options.getChannel("channel");
    const content = options.getString("content") || " ";

    if (!client.config.utilities.NotifyTwitch.Enable) {
      await handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.settings", "notify_twitch_disabled", {
                twitchusername: TwitchUsername,
                channelid: channel ? `<#${channel.id}>` : "N/A",
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
      return;
    }

    let twitchData = await client.db.NotifyTwitch.get(`${handler.guild!.id}`);

    if (!twitchData) {
      twitchData = {
        GuildId: handler.guild!.id,
        GuildName: handler.guild!.name,
        TokenAccess: twitchData?.TokenAccess || null,
        ExpiresIn: twitchData?.ExpiresIn || null,
        Notifications: [],
      };
    }

    if (action === "add") {
      const existingNotification = twitchData.Notifications.find(
        (notification) => notification.TwitchUsername === TwitchUsername
      );

      if (existingNotification) {
        await handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, "commands.settings", "notify_twitch_already", {
                  twitchusername: TwitchUsername,
                  channelid: channel ? `<#${channel.id}>` : "N/A",
                  user: String(handler.user?.displayName || handler.user?.tag),
                  botname: client.user!.username || client.user!.displayName,
                })}`
              )
              .setColor(client.color_main),
          ],
        });
        return;
      }

      const guildData = await client.db.PremiumGuildLegacy.get(String(handler.guild?.id));
      const notificationLimit = Number(
        guildData?.isPremium
          ? client.config.utilities.NotifyTwitch.LimitPremium
          : client.config.utilities.NotifyTwitch.LimitNonPremium
      );

      if (twitchData.Notifications.length >= notificationLimit) {
        let description;

        if (guildData?.isPremium) {
          description = `${client.i18n.get(
            handler.language,
            "commands.settings",
            "notify_twitch_limit_reached_premium",
            {
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
              limit: String(notificationLimit),
              premium: client.config.bot.PREMIUM_URL,
              limitpremium: String(client.config.utilities.NotifyTwitch.LimitPremium),
            }
          )}`;
        } else {
          description = `${client.i18n.get(
            handler.language,
            "commands.settings",
            "notify_twitch_limit_reached_non_premium",
            {
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
              limit: String(notificationLimit),
              premium: client.config.bot.PREMIUM_URL,
              limitpremium: String(client.config.utilities.NotifyTwitch.LimitPremium),
            }
          )}`;
        }

        await handler.editReply({
          embeds: [new EmbedBuilder().setDescription(description).setColor(client.color_main)],
        });
        return;
      }

      if (!channel || channel.type !== ChannelType.GuildText) {
        await handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(
                  handler.language,
                  "commands.settings",
                  "notify_twitch_invalid_channel",
                  {
                    twitchusername: TwitchUsername,
                    channelid: channel ? `<#${channel.id}>` : "N/A",
                    user: String(handler.user?.displayName || handler.user?.tag),
                    botname: client.user!.username || client.user!.displayName,
                  }
                )}`
              )
              .setColor(client.color_main),
          ],
        });
        return;
      }
      twitchData.Notifications.push({
        TwitchUsername,
        ChannelID: channel.id,
        Content: content,
        LastStatus: "offline",
      });
      await client.db.NotifyTwitch.set(`${handler.guild!.id}`, twitchData);

      await handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.settings", "notify_twitch_set", {
                twitchusername: TwitchUsername,
                channelid: channel ? `<#${channel.id}>` : "N/A",
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
      return;
    } else if (action === "remove") {
      const notificationIndex = twitchData.Notifications.findIndex(
        (notification) => notification.TwitchUsername === TwitchUsername
      );

      if (notificationIndex === -1) {
        await handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(
                  handler.language,
                  "commands.settings",
                  "notify_twitch_not_found",
                  {
                    twitchusername: TwitchUsername,
                    user: String(handler.user?.displayName || handler.user?.tag),
                    botname: client.user!.username || client.user!.displayName,
                  }
                )}`
              )
              .setColor(client.color_main),
          ],
        });
        return;
      }
      twitchData.Notifications.splice(notificationIndex, 1);
      await client.db.NotifyTwitch.set(`${handler.guild!.id}`, twitchData);

      await handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.settings", "notify_twitch_removed", {
                twitchusername: TwitchUsername,
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
      return;
    }
    await handler.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${client.i18n.get(handler.language, "commands.settings", "notify_twitch_error", {
              twitchusername: TwitchUsername,
              channelid: channel ? `<#${channel.id}>` : "N/A",
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
            })}`
          )
          .setColor(client.color_main),
      ],
    });
  }
}
