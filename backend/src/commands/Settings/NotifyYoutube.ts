import {
  ApplicationCommandOptionType,
  CommandInteractionOptionResolver,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import Parser from "rss-parser";
import { Manager } from "../../manager.js";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";

const data: Config = new ConfigDataService().data;
const parser = new Parser();

export default class implements Command {
  public name = ["notify", "youtube"];
  public description = "Manage Youtube stream notifications";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.NotifyYoutube;
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
      name: "youtubeid",
      description: "The YouTube channel ID",
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
    const YouTubeChannelId = options.getString("youtubeid");
    const channel = options.getChannel("channel");
    const content = options.getString("content") || " ";

    if (!client.config.utilities.NotifyYoutube.Enable) {
      await handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.settings", "notify_youtube_disabled", {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
      return;
    }

    try {
      const YOUTUBE_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YouTubeChannelId}`;
      const feed = await parser.parseURL(YOUTUBE_RSS_URL);
      const latestVideo = feed.items[0];
      const lastVideoId = latestVideo.id.replace("yt:video:", "");
      const publishDate = latestVideo.isoDate;
      const channelName = feed.title;

      let youtube = await client.db.NotifyYoutube.get(`${handler.guild!.id}`);
      if (!youtube) {
        youtube = {
          GuildId: handler.guild!.id,
          GuildName: handler.guild!.name,
          Notifications: [],
        };
      }

      if (action === "remove") {
        const notificationIndex = youtube.Notifications.findIndex(
          (notify) => notify.YouTubeChannelId === YouTubeChannelId
        );

        if (notificationIndex === -1) {
          await handler.editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${client.i18n.get(
                    handler.language,
                    "commands.settings",
                    "notify_youtube_not_found",
                    {
                      ytchannel: channelName,
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

        youtube.Notifications.splice(notificationIndex, 1);
        await client.db.NotifyYoutube.set(`${handler.guild!.id}`, youtube);

        await handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(
                  handler.language,
                  "commands.settings",
                  "notify_youtube_removed",
                  {
                    ytchannel: channelName,
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

      const guildData = await client.db.PremiumGuildLegacy.get(String(handler.guild?.id));
      const notificationLimit = Number(
        guildData?.isPremium
          ? client.config.utilities.NotifyYoutube.LimitPremium
          : client.config.utilities.NotifyYoutube.LimitNonPremium
      );

      if (youtube.Notifications.length >= notificationLimit) {
        const description = guildData?.isPremium
          ? client.i18n.get(
              handler.language,
              "commands.settings",
              "notify_youtube_limit_reached_premium",
              {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
                limit: String(notificationLimit),
                premium: client.config.bot.PREMIUM_URL,
                limitpremium: String(client.config.utilities.NotifyTwitch.LimitPremium),
              }
            )
          : client.i18n.get(
              handler.language,
              "commands.settings",
              "notify_youtube_limit_reached_non_premium",
              {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
                limit: String(notificationLimit),
                premium: client.config.bot.PREMIUM_URL,
                limitpremium: String(client.config.utilities.NotifyTwitch.LimitPremium),
              }
            );

        await handler.editReply({
          embeds: [new EmbedBuilder().setDescription(description).setColor(client.color_main)],
        });
        return;
      }

      if (action === "add") {
        if (!channel || channel.type !== ChannelType.GuildText) {
          await handler.editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${client.i18n.get(
                    handler.language,
                    "commands.settings",
                    "notify_youtube_invalid_channel",
                    {
                      ytchannel: channelName,
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

        const existingNotification = youtube?.Notifications.find(
          (notify) => notify.YouTubeChannelId === YouTubeChannelId
        );
        if (existingNotification) {
          await handler.editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${client.i18n.get(
                    handler.language,
                    "commands.settings",
                    "notify_youtube_already",
                    {
                      ytchannel: channelName,
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

        youtube.Notifications.push({
          YouTubeChannelId,
          ChannelID: channel.id,
          Content: content,
          LastVideoId: lastVideoId,
          LastPublishDate: publishDate,
          LastStatusLive: false,
        });

        await client.db.NotifyYoutube.set(`${handler.guild!.id}`, youtube);

        await handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, "commands.settings", "notify_youtube_set", {
                  ytchannel: channelName,
                  channelid: `<#${channel.id}>`,
                  user: String(handler.user?.displayName || handler.user?.tag),
                  botname: client.user!.username || client.user!.displayName,
                })}`
              )
              .setColor(client.color_main),
          ],
        });
      }
    } catch (error) {
      await handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.settings", "notify_youtube_404", {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }
  }
}
