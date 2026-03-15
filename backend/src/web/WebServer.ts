import express from "express";
import expressWs from "express-ws";
import { Manager } from "../manager.js";
import path from "path";
import { fileURLToPath } from "url";
import md5 from "md5";
import axios from "axios";
import cron from "node-cron";
import crypto from "crypto";
import {
  ButtonBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonStyle,
  TextChannel,
  Interaction,
  MessageFlags,
} from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebServer {
  client: Manager;
  app: expressWs.Application;
  port: number;
  channelID: string;

  constructor(client: Manager) {
    this.client = client;
    this.app = expressWs(express()).app;
    this.port = this.client.config.features.WebServer.Port;
    this.app.use("/vote", express.raw({ type: "application/json" }), (req, res, next) => {
      if (req.body && Buffer.isBuffer(req.body)) {
        (req as any).rawBody = req.body.toString("utf8");
      }
      next();
    });

    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());

    this.startCronJobs();
    this.alive();
    this.setupVoteWebhook();

    if (this.client.config.features.WebServer.LAST_FM_SCROBBLED.Enable) {
      this.setupLastfmCallback();
    }

    this.expose();
    this.handleInteractions();

    this.app.use("/transcript", express.static(path.join("transcript")));
  }

  alive() {
    this.app.get("/", (req, res) => {
      res.send("Server is alive! Discord bot is up and running.");
    });
  }

  setupLastfmCallback() {
    this.app.get("/lastfm", async (req, res) => {
      const token = req.query.token as string;
      const userId = req.query.user as string;

      if (!token || !userId) {
        return res.status(400).send("Invalid request.");
      }

      try {
        const response = await axios.get("http://ws.audioscrobbler.com/2.0/", {
          params: {
            method: "auth.getSession",
            api_key: this.client.config.features.WebServer.LAST_FM_SCROBBLED.ApiKey,
            token: token,
            api_sig: this.generateApiSignature({
              api_key: this.client.config.features.WebServer.LAST_FM_SCROBBLED.ApiKey,
              method: "auth.getSession",
              token: token,
            }),
            format: "json",
          },
        });

        const sessionKey = response.data.session.key;
        const lastfmUsername = response.data.session.name;

        const new_data = {
          userId: userId,
          sessionKey: sessionKey,
          lastfmUsername: lastfmUsername,
          token: token,
        };

        await this.client.db.LastFm.set(`${userId}`, new_data);

        // If the request originated from the dashboard, redirect back to the profile page
        const from = req.query.from as string;
        if (from === "dashboard") {
          const frontendUrl =
            this.client.config.features.RestAPI?.DashboardUrl || "http://localhost:3000";
          res.redirect(
            `${frontendUrl}/profile?lastfm=connected&user=${encodeURIComponent(lastfmUsername)}`
          );
        } else {
          const redirectUrl = `${this.client.config.features.WebServer.LAST_FM_SCROBBLED.RedirectOnSuccess}?user=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
          res.redirect(redirectUrl);
        }
      } catch (error) {
        this.client.logger.error(WebServer.name, error);
        const from = req.query.from as string;
        if (from === "dashboard") {
          const frontendUrl =
            this.client.config.features.RestAPI?.DashboardUrl || "http://localhost:3000";
          res.redirect(`${frontendUrl}/profile?lastfm=error`);
        } else {
          const redirectUrl = `${this.client.config.features.WebServer.LAST_FM_SCROBBLED.RedirectOnError}?user=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
          res.redirect(redirectUrl);
        }
      }
    });
  }

  generateApiSignature(params: { [key: string]: string }) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("");

    const stringToHash =
      sortedParams + this.client.config.features.WebServer.LAST_FM_SCROBBLED.Secret;
    return md5(stringToHash);
  }

  setupVoteWebhook() {
    const client = this.client;
    const WEBHOOK_SECRET = client.config.features.WebServer.TOPGG_VOTELOGS.TopGgWebhookSecret;

    if (!WEBHOOK_SECRET) return;

    this.app.post("/vote", async (req, res) => {
      try {
        const signatureHeader = req.headers["x-topgg-signature"] as string;
        if (!signatureHeader) {
          client.logger.warn(WebServer.name, "Missing signature in Top.gg webhook");
          return res.status(401).send("Missing signature");
        }

        const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")));
        const timestamp = parts.t;
        const receivedSignature = parts.v1;

        const rawBody = (req as any).rawBody;
        if (!rawBody) {
          return res.status(400).send("No raw body found");
        }

        const dataToVerify = `${timestamp}.${rawBody}`;
        const computedSignature = crypto
          .createHmac("sha256", WEBHOOK_SECRET)
          .update(dataToVerify)
          .digest("hex");

        if (computedSignature !== receivedSignature) {
          client.logger.warn(WebServer.name, "Invalid signature in Top.gg webhook");
          return res.status(403).send("Invalid signature");
        }

        const payload = JSON.parse(rawBody);

        if (payload.type === "vote.create" || payload.type === "webhook.test") {
          const voteData = payload.data;
          const voterId = voteData.user.platform_id;
          const botId = voteData.project?.platform_id || client.user?.id;
          const language = client.config.bot.LANGUAGE || "en";
          const isTest = payload.type === "webhook.test";

          if (isTest) {
            client.logger.info(
              WebServer.name,
              `Top.gg Test Vote accepted for Discord User ID: ${voterId}`
            );
          } else {
            client.logger.info(
              WebServer.name,
              `✅ Top.gg Vote accepted for Discord User ID: ${voterId}`
            );
          }

          res.status(200).send("OK");

          (async () => {
            try {
              const voteUser = await client.users.fetch(voterId).catch(() => null);

              if (!voteUser) {
                client.logger.warn(
                  WebServer.name,
                  `Failed to find Discord user with ID: ${voterId}`
                );
                return;
              }

              let newCountStr = "1";
              if (!isTest) {
                const userVotes = await client.db.votes.get(voterId);
                const currentTime = Date.now();

                if (!userVotes) {
                  await client.db.votes.set(voterId, {
                    user: voterId,
                    username: voteUser.username,
                    count: "1",
                    lastVoteTime: currentTime,
                  });
                } else {
                  newCountStr = (parseInt(userVotes.count) + 1).toString();
                  await client.db.votes.set(voterId, {
                    user: voterId,
                    username: voteUser.username,
                    count: newCountStr,
                    lastVoteTime: currentTime,
                  });
                }
              } else {
                const tempVotes = await client.db.votes.get(voterId);
                newCountStr = tempVotes ? tempVotes.count : "1";
              }

              const channelId = client.config.features.WebServer.TOPGG_VOTELOGS.LogVoteChannelID;
              if (!channelId || channelId.length == 0) return;

              const channel = (await client.channels
                .fetch(channelId)
                .catch(() => undefined)) as TextChannel;
              if (!channel || !channel.isTextBased()) return;

              let descriptionText = client.i18n.get(language, "events.helper", "vote_desc", {
                voteuser: `<@${voterId}>` || voteUser.displayName,
                bot: `<@${botId}>`,
                votebot: client.user!.username,
                voteurl: `https://top.gg/bot/${client.user?.id}/vote`,
              });

              if (isTest) {
                descriptionText = `**[WEBHOOK TEST]**\n${descriptionText}`;
              }

              const embed = new EmbedBuilder()
                .setAuthor({
                  name: `${voteUser.displayName || voteUser.tag}`,
                  iconURL: voteUser.displayAvatarURL(),
                })
                .setColor(client.color_main)
                .setDescription(descriptionText)
                .setThumbnail(voteUser.displayAvatarURL({ size: 1024 }))
                .setFooter({
                  text: client.i18n.get(language, "events.helper", "vote_footer", {
                    count: newCountStr,
                  }),
                });

              const ButtonVote = new ActionRowBuilder<ButtonBuilder>();
              const ButtonVoteComp = new ButtonBuilder()
                .setCustomId("reminder_vote")
                .setStyle(ButtonStyle.Secondary)
                .setLabel(client.i18n.get(language, "events.helper", "reminder_label_name"));

              const emojiStr = client.i18n.get(language, "events.helper", "reminder_label_emoji");
              if (emojiStr) {
                ButtonVoteComp.setEmoji(emojiStr);
              }
              ButtonVote.addComponents(ButtonVoteComp);

              await channel.send({
                embeds: [embed],
                components: [ButtonVote],
              });
            } catch (err) {
              client.logger.error(WebServer.name, `Error processing vote payload: ${err}`);
            }
          })();
        } else {
          res.status(200).send("OK");
        }
      } catch (error) {
        client.logger.error(WebServer.name, `Webhook Error: ${error}`);
        if (!res.headersSent) {
          res.status(500).send("Internal Server Error");
        }
      }
    });
  }

  handleInteractions() {
    this.client.on("interactionCreate", async (interaction: Interaction): Promise<void> => {
      const language = this.client.config.bot.LANGUAGE || "en";
      if (!interaction.isButton()) return;

      if (interaction.customId === "reminder_vote") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral as any });

        const reminderUserId = interaction.user.id;
        let userVotes = await this.client.db.votes.get(reminderUserId);

        if (!userVotes) {
          let hasVotedAPI = false;

          if (this.client.topgg) {
            const voteStatus = await this.client.topgg.checkVote(reminderUserId);
            if (voteStatus === 1) {
              hasVotedAPI = true;
            }
          }

          if (hasVotedAPI) {
            const currentTime = Date.now();
            const voteUser = await this.client.users.fetch(reminderUserId).catch(() => null);

            await this.client.db.votes.set(reminderUserId, {
              user: reminderUserId,
              username: voteUser ? voteUser.username : "Unknown",
              count: "1",
              lastVoteTime: currentTime,
            });
            userVotes = await this.client.db.votes.get(reminderUserId);
          } else {
            await interaction.editReply({
              content: `${this.client.i18n.get(language, "events.helper", "reminder_no_vote_warning")}`,
            });
            return;
          }
        }

        const existingReminder = await this.client.db.VoteReminders.get(reminderUserId);

        if (existingReminder) {
          await this.client.db.VoteReminders.delete(reminderUserId);
          await interaction.editReply({
            content: `${this.client.i18n.get(language, "events.helper", "reminder_cancel_content")}`,
          });
        } else {
          const reminderTime = userVotes.lastVoteTime + 12 * 60 * 60 * 1000;

          await this.client.db.VoteReminders.set(reminderUserId, {
            messageId: interaction.message.id,
            channelId: interaction.channelId,
            reminderTime: reminderTime,
          });

          await interaction.editReply({
            content: `${this.client.i18n.get(language, "events.helper", "reminder_set_content")}`,
          });
        }
      }
    });
  }

  startCronJobs() {
    cron.schedule("0 * * * *", async () => {
      await this.checkReminders();
    });
  }

  async checkReminders() {
    const language = this.client.config.bot.LANGUAGE || "en";
    const reminders = await this.client.db.VoteReminders.all();
    const now = Date.now();

    for (const reminder of reminders) {
      const userId = reminder.id;
      const nextVoteTime = reminder.value.reminderTime;

      if (nextVoteTime <= now) {
        const user = await this.client.users.fetch(userId).catch(() => null);
        const channel = (await this.client.channels
          .fetch(reminder.value.channelId)
          .catch(() => undefined)) as TextChannel;

        if (channel && user) {
          const reminderMessage = await channel.messages
            .fetch(reminder.value.messageId)
            .catch(() => undefined);
          if (reminderMessage) {
            const reminderEmbed = new EmbedBuilder()
              .setTitle(this.client.i18n.get(language, "events.helper", "reminder_title"))
              .setDescription(
                this.client.i18n.get(language, "events.helper", "reminder_desc", {
                  voteurl: `https://top.gg/bot/${this.client.user?.id}/vote`,
                })
              )
              .setColor(this.client.color_second);

            await reminderMessage.reply({
              content: `<@${userId}>`,
              embeds: [reminderEmbed],
            });
          }
        }

        await this.client.db.VoteReminders.delete(userId);
      }
    }
    this.client.logger.info(WebServer.name, "Running Top.gg vote reminder checks.");
  }

  expose() {
    this.app.listen(this.port);
    this.client.logger.info(WebServer.name, `WebServer running at port: ${this.port}`);
  }
}
