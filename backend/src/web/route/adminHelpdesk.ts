import { FastifyRequest, FastifyReply } from "fastify";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ChannelType,
} from "discord.js";
import * as discordTranscripts from "mewwme-transcripts";
import { Manager } from "../../manager.js";

function isAdmin(client: Manager, userId: string): boolean {
  return client.config.bot.ADMIN.includes(userId) || client.config.bot.OWNER_ID === userId;
}

async function fetchGuildWithChannels(client: Manager, guildId: string) {
  const guild =
    client.guilds.cache.get(guildId) ??
    (await client.guilds.fetch(guildId).catch(() => null));
  if (!guild) return null;
  if (guild.channels.cache.size === 0) {
    await guild.channels.fetch().catch(() => null);
  }
  if (guild.roles.cache.size <= 1) {
    await guild.roles.fetch().catch(() => null);
  }
  return guild;
}

export async function getTicketConfig(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId } = req.query as { userId: string; guildId?: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    if (guildId) {
      const setup = await client.db.TicketSetup.get(guildId);
      const guild = client.guilds.cache.get(guildId);
      return reply.send({
        success: true,
        data: setup
          ? {
              enabled: setup.enabled ?? false,
              guildId,
              guildName: guild?.name ?? guildId,
              guildIcon: guild?.iconURL({ size: 64 }) ?? null,
              channelId: setup.channelId ?? "",
              openCategory: setup.openCategory ?? "",
              closeCategory: setup.closeCategory ?? "",
              roleId: setup.roleId ?? "",
              embed: setup.embed ?? {},
            }
          : null,
      });
    }

    const all = await client.db.TicketSetup.all();
    const setups = (all as any[]).map((entry) => {
      const id = String(entry.key ?? entry.id ?? "");
      const v = entry.value ?? entry.data ?? entry;
      const guild = client.guilds.cache.get(id);
      return {
        enabled: v.enabled ?? false,
        guildId: id,
        guildName: guild?.name ?? id,
        guildIcon: guild?.iconURL({ size: 64 }) ?? null,
        channelId: v.channelId ?? "",
        openCategory: v.openCategory ?? "",
        closeCategory: v.closeCategory ?? "",
        roleId: v.roleId ?? "",
        embed: v.embed ?? {},
      };
    });
    return reply.send({ success: true, data: setups });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to fetch ticket config." });
  }
}

export async function postTicketToggle(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId, enabled } = req.body as {
    userId: string;
    guildId: string;
    enabled: boolean;
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId) return reply.code(400).send({ error: "guildId is required." });

  try {
    const existing = await client.db.TicketSetup.get(guildId);
    if (existing) {
      await client.db.TicketSetup.set(guildId, { ...existing, enabled });
    } else {
      await client.db.TicketSetup.set(guildId, {
        enabled,
        guildId,
        channelId: "",
        openCategory: "",
        closeCategory: "",
        roleId: "",
        embed: {},
        ticketCount: 0,
        activeTickets: {},
        history: [],
      });
    }
    return reply.send({ success: true, enabled });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to toggle ticket system." });
  }
}

export async function getTicketGuildData(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId } = req.query as { userId: string; guildId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId) return reply.code(400).send({ error: "guildId is required." });

  try {
    const guild = await fetchGuildWithChannels(client, guildId);
    if (!guild) return reply.code(404).send({ error: "Guild not found or bot is not in it." });

    const textChannels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText && c.viewable)
      .map((c) => ({ id: c.id, name: c.name }));

    const categories = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildCategory)
      .map((c) => ({ id: c.id, name: c.name }));

    const roles = guild.roles.cache
      .filter((r) => !r.managed && r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));

    return reply.send({
      success: true,
      data: {
        guildName: guild.name,
        guildIcon: guild.iconURL({ size: 64 }),
        textChannels,
        categories,
        roles,
      },
    });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to fetch guild data." });
  }
}

export async function postTicketSetup(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId, channelId, openCategory, closeCategory, roleId, embed } =
    req.body as {
      userId: string;
      guildId: string;
      channelId: string;
      openCategory: string;
      closeCategory: string;
      roleId: string;
      embed?: {
        title?: string;
        description?: string;
        thumbnail?: string;
        image?: string;
        footer?: string;
      };
    };

  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId || !channelId || !openCategory || !closeCategory || !roleId) {
    return reply.code(400).send({ error: "Required: guildId, channelId, openCategory, closeCategory, roleId." });
  }

  try {
    const guild = await fetchGuildWithChannels(client, guildId);
    if (!guild) return reply.code(404).send({ error: "Guild not found or bot is not in it." });

    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText || !channel.viewable)
      return reply.code(400).send({ error: "Invalid or non-viewable text channel." });

    const openCat = guild.channels.cache.get(openCategory);
    if (!openCat || openCat.type !== ChannelType.GuildCategory)
      return reply.code(400).send({ error: "Open category must be a Discord category." });

    const closeCat = guild.channels.cache.get(closeCategory);
    if (!closeCat || closeCat.type !== ChannelType.GuildCategory)
      return reply.code(400).send({ error: "Close category must be a Discord category." });

    if (!guild.roles.cache.has(roleId))
      return reply.code(400).send({ error: "Role not found in this guild." });

    // Build and send embed
    const isValidUrl = (url?: string): boolean => {
      if (!url) return false;
      try { new URL(url); return true; } catch { return false; }
    };

    const ticketEmbed = new EmbedBuilder().setColor((client as any).color_main ?? 0x5865f2);
    if (embed?.title) ticketEmbed.setTitle(embed.title);
    if (embed?.description) ticketEmbed.setDescription(embed.description);
    if (embed?.thumbnail && isValidUrl(embed.thumbnail)) ticketEmbed.setThumbnail(embed.thumbnail);
    if (embed?.image && isValidUrl(embed.image)) ticketEmbed.setImage(embed.image);
    if (embed?.footer) ticketEmbed.setFooter({ text: embed.footer });

    if (!embed?.title && !embed?.description) {
      ticketEmbed
        .setTitle("ðŸŽ« Support Ticket")
        .setDescription("Click the button below to create a support ticket. Our staff will assist you shortly.");
    }

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket-setup-${guildId}-${openCategory}`)
        .setLabel("Create Ticket")
        .setStyle(ButtonStyle.Success)
    );

    const sentMessage = await (channel as TextChannel).send({ embeds: [ticketEmbed], components: [button] });

    const existingSetup = await client.db.TicketSetup.get(guildId);
    await client.db.TicketSetup.set(guildId, {
      enabled: true,
      guildId,
      channelId,
      openCategory,
      closeCategory,
      roleId,
      messageId: sentMessage.id,
      embed: embed ?? {},
      ticketCount: existingSetup?.ticketCount ?? 0,
      activeTickets: existingSetup?.activeTickets ?? {},
      history: existingSetup?.history ?? [],
    });

    return reply.send({ success: true, message: "Ticket system configured and deployed." });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to setup ticket system." });
  }
}

export async function deleteTicketSetup(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId } = req.body as { userId: string; guildId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId) return reply.code(400).send({ error: "guildId is required." });

  try {
    const setup = await client.db.TicketSetup.get(guildId);
    if (setup?.messageId && setup?.channelId) {
      try {
        const guild = await fetchGuildWithChannels(client, guildId);
        if (guild) {
          const channel = guild.channels.cache.get(setup.channelId) as TextChannel | undefined;
          if (channel) {
            const msg = await channel.messages.fetch(setup.messageId).catch(() => null);
            if (msg) await msg.delete().catch(() => {});
          }
        }
      } catch { /* best effort */ }
    }

    await client.db.TicketSetup.delete(guildId);
    return reply.send({ success: true });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to delete ticket setup." });
  }
}

export async function getTicketHistory(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId } = req.query as { userId: string; guildId?: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    const allSetups = await client.db.TicketSetup.all();
    let tickets: any[] = [];
    for (const entry of allSetups as any[]) {
      const id = String(entry.key ?? entry.id ?? "");
      const v = entry.value ?? entry.data ?? entry;
      const history = v.history ?? [];
      for (const h of history) {
        tickets.push({
          key: `${h.guildId ?? id}-${h.userId}-${h.ticketCount}`,
          ticketCount: h.ticketCount ?? 0,
          guildId: h.guildId ?? id,
          userId: h.userId ?? "",
          Username: h.Username ?? "",
          ChannelId: h.ChannelId ?? "",
          reason: h.reason ?? "",
          status: h.status ?? "open",
          openedAt: h.openedAt ?? 0,
          closedAt: h.closedAt ?? null,
          closedBy: h.closedBy ?? null,
          transcriptUrl: h.transcriptUrl ?? null,
        });
      }
    }

    if (guildId) {
      tickets = tickets.filter((t) => t.guildId === guildId);
    }

    tickets.sort((a, b) => {
      if (a.status === "open" && b.status !== "open") return -1;
      if (a.status !== "open" && b.status === "open") return 1;
      return b.openedAt - a.openedAt;
    });

    return reply.send({ success: true, data: tickets });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to fetch ticket history." });
  }
}

export async function postCloseTicket(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId, ticketUserId, ticketCount } = req.body as {
    userId: string;
    guildId: string;
    ticketUserId: string;
    ticketCount: number;
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId || !ticketUserId) return reply.code(400).send({ error: "guildId and ticketUserId are required." });

  try {
    const guild = await fetchGuildWithChannels(client, guildId);
    if (!guild) return reply.code(404).send({ error: "Guild not found." });

    const setupData = await client.db.TicketSetup.get(guildId);
    if (!setupData) return reply.code(404).send({ error: "No ticket setup found for this guild." });
    if (!setupData.activeTickets) setupData.activeTickets = {};
    if (!setupData.history) setupData.history = [];
    const closeCategoryId = setupData.closeCategory;
    const roleId = setupData.roleId;

    // Find the ticket data
    const ticketData = setupData.activeTickets[ticketUserId];
    if (!ticketData) return reply.code(404).send({ error: "No open ticket found for this user." });

    const channel = guild.channels.cache.get(ticketData.ChannelId) as TextChannel | undefined;
    if (!channel) return reply.code(404).send({ error: "Ticket channel not found." });

    // Generate transcript
    const today = new Date();
    const day = today.getDate().toString().padStart(2, "0");
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const year = today.getFullYear();
    const safeUsername = ticketData.Username.replace(/[-._]/g, "");
    const tCount = ticketData.ticketCount || ticketCount || 1;
    const filename = `${tCount}-${safeUsername}-${day}-${month}-${year}.html`;

    let attachmentUrl = "";
    try {
      const attachment = await discordTranscripts.createTranscript(channel as any, {
        limit: -1,
        returnType: discordTranscripts.ExportReturnType.Attachment,
        filename,
        saveImages: true,
        footerText: "Exported {number} message{s}",
        poweredBy: true,
        hydrate: true,
      });

      const message = await channel.send({ files: [attachment] });
      attachmentUrl = message.attachments.first()?.url ?? "";

      // DM user with transcript
      const user = await guild.members.fetch(ticketData.userId).catch(() => null);
      if (user) {
        const dmEmbed = new EmbedBuilder()
          .setColor((client as any).color_main ?? 0x5865f2)
          .setTitle("Ticket Closed")
          .setDescription("Your support ticket has been closed by an administrator. The transcript is attached below.");
        const dmButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setLabel("Download Transcript").setURL(attachmentUrl).setStyle(ButtonStyle.Link)
        );
        await user.send({ embeds: [dmEmbed], components: [dmButton], files: [attachment] }).catch(() => {});
      }
    } catch (err) {
      client.logger.warn("AdminTicketAPI", `Transcript generation failed: ${err}`);
    }

    // Move channel to close category
    if (closeCategoryId) {
      const closeCat = guild.channels.cache.get(closeCategoryId);
      if (closeCat && closeCat.type === ChannelType.GuildCategory) {
        await channel.setParent(closeCat).catch(() => {});
      }
    }

    // Update permissions, rename channel
    await channel.permissionOverwrites.set([
      { id: guild.roles.everyone.id, deny: ["ViewChannel"] },
      ...(roleId ? [{ id: roleId, allow: ["ViewChannel" as const, "SendMessages" as const] }] : []),
      { id: client.user!.id, allow: ["ManageChannels" as const] },
    ]).catch(() => {});
    await channel.setName(`closed-${ticketData.Username}`).catch(() => {});

    // Send closed embed + delete button in channel
    const closedEmbed = new EmbedBuilder()
      .setTitle("Ticket Closed")
      .setDescription("This ticket has been closed from the admin dashboard.")
      .setColor((client as any).color_main ?? 0x5865f2);
    const deleteBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`delete-ticket-${ticketData.userId}`).setLabel("Delete Channel").setStyle(ButtonStyle.Danger)
    );
    const rows: ActionRowBuilder<ButtonBuilder>[] = [deleteBtn];
    if (attachmentUrl) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setLabel("Download Transcript").setURL(attachmentUrl).setStyle(ButtonStyle.Link)
      ));
    }
    await channel.send({ embeds: [closedEmbed], components: rows }).catch(() => {});

    // Update history entry
    const historyEntry = setupData.history.find(
      (h) => h.userId === ticketData.userId && h.ticketCount === tCount
    );
    if (historyEntry) {
      historyEntry.status = "closed";
      historyEntry.closedAt = Date.now();
      historyEntry.closedBy = userId;
      historyEntry.transcriptUrl = attachmentUrl || undefined;
    }

    // Delete active ticket data
    delete setupData.activeTickets[ticketUserId];
    await client.db.TicketSetup.set(guildId, setupData);

    return reply.send({ success: true, message: "Ticket closed successfully." });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to close ticket." });
  }
}

export async function postDeleteTicket(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId, ticketUserId, ticketCount } = req.body as {
    userId: string;
    guildId: string;
    ticketUserId: string;
    ticketCount: number;
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId || !ticketUserId) return reply.code(400).send({ error: "guildId and ticketUserId are required." });

  try {
    const guild = await fetchGuildWithChannels(client, guildId);
    if (!guild) return reply.code(404).send({ error: "Guild not found." });

    const setupData = await client.db.TicketSetup.get(guildId);
    if (!setupData) return reply.code(404).send({ error: "No ticket setup found for this guild." });
    if (!setupData.activeTickets) setupData.activeTickets = {};
    if (!setupData.history) setupData.history = [];

    const tCount = ticketCount || 1;

    // Try to close the ticket channel if it still exists
    const ticketData = setupData.activeTickets[ticketUserId];
    if (ticketData) {
      const channel = guild.channels.cache.get(ticketData.ChannelId) as TextChannel | undefined;
      if (channel) {
        // Generate transcript before deleting
        try {
          const today = new Date();
          const day = today.getDate().toString().padStart(2, "0");
          const month = (today.getMonth() + 1).toString().padStart(2, "0");
          const year = today.getFullYear();
          const safeUsername = ticketData.Username.replace(/[-._]/g, "");
          const filename = `${tCount}-${safeUsername}-${day}-${month}-${year}.html`;

          const attachment = await discordTranscripts.createTranscript(channel as any, {
            limit: -1,
            returnType: discordTranscripts.ExportReturnType.Attachment,
            filename,
            saveImages: true,
            footerText: "Exported {number} message{s}",
            poweredBy: true,
            hydrate: true,
          });

          // DM user with transcript before deletion
          const member = await guild.members.fetch(ticketData.userId).catch(() => null);
          if (member) {
            const dmEmbed = new EmbedBuilder()
              .setColor((client as any).color_main ?? 0x5865f2)
              .setTitle("Ticket Deleted")
              .setDescription("Your support ticket has been closed and deleted by an administrator. The transcript is attached below.");
            await member.send({ embeds: [dmEmbed], files: [attachment] }).catch(() => {});
          }
        } catch (err) {
          client.logger.warn("AdminTicketAPI", `Transcript generation failed before delete: ${err}`);
        }

        // Delete the channel
        await channel.delete("Ticket deleted from admin dashboard").catch(() => {});
      }

      // Delete active ticket data
      delete setupData.activeTickets[ticketUserId];
    } else {
      const historyEntry = setupData.history.find(
        (h) => h.userId === ticketUserId && h.ticketCount === tCount
      );
      if (historyEntry?.ChannelId) {
        const channel = guild.channels.cache.get(historyEntry.ChannelId) as TextChannel | undefined;
        if (channel) {
          await channel.delete("Ticket deleted from admin dashboard").catch(() => {});
        }
      }
    }

    // Remove ticket history entry
    setupData.history = setupData.history.filter(
      (h) => !(h.userId === ticketUserId && h.ticketCount === tCount)
    );
    await client.db.TicketSetup.set(guildId, setupData);

    return reply.send({ success: true, message: "Ticket deleted successfully." });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to delete ticket." });
  }
}

export async function putTicketSetup(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId, channelId, openCategory, closeCategory, roleId, embed } =
    req.body as {
      userId: string;
      guildId: string;
      channelId: string;
      openCategory: string;
      closeCategory: string;
      roleId: string;
      embed?: {
        title?: string;
        description?: string;
        thumbnail?: string;
        image?: string;
        footer?: string;
      };
    };

  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId) return reply.code(400).send({ error: "guildId is required." });

  try {
    const existing = await client.db.TicketSetup.get(guildId);

    const updatedChannelId = channelId || existing?.channelId || "";
    const updatedOpenCategory = openCategory || existing?.openCategory || "";
    const updatedCloseCategory = closeCategory || existing?.closeCategory || "";
    const updatedRoleId = roleId || existing?.roleId || "";
    const updatedEmbed = embed ?? existing?.embed ?? {};

    await client.db.TicketSetup.set(guildId, {
      enabled: existing?.enabled ?? true,
      guildId,
      channelId: updatedChannelId,
      openCategory: updatedOpenCategory,
      closeCategory: updatedCloseCategory,
      roleId: updatedRoleId,
      messageId: existing?.messageId,
      embed: updatedEmbed,
      ticketCount: existing?.ticketCount ?? 0,
      activeTickets: existing?.activeTickets ?? {},
      history: existing?.history ?? [],
    });

    // Update the embed message in Discord channel
    try {
      const guild = await fetchGuildWithChannels(client, guildId);
      if (guild) {
        const channel = guild.channels.cache.get(updatedChannelId) as TextChannel | undefined;
        if (channel) {
          const messages = await channel.messages.fetch({ limit: 50 });
          const botMessage = messages.find(
            (m) =>
              m.author.id === client.user!.id &&
              m.components.some((row: any) =>
                row.components?.some((c: any) => c.customId?.startsWith(`ticket-setup-${guildId}`))
              )
          );

          if (botMessage) {
            const isValidUrl = (url?: string): boolean => {
              if (!url) return false;
              try { new URL(url); return true; } catch { return false; }
            };

            const ticketEmbed = new EmbedBuilder().setColor((client as any).color_main ?? 0x5865f2);
            if (updatedEmbed.title) ticketEmbed.setTitle(updatedEmbed.title);
            if (updatedEmbed.description) ticketEmbed.setDescription(updatedEmbed.description);
            if (updatedEmbed.thumbnail && isValidUrl(updatedEmbed.thumbnail)) ticketEmbed.setThumbnail(updatedEmbed.thumbnail);
            if (updatedEmbed.image && isValidUrl(updatedEmbed.image)) ticketEmbed.setImage(updatedEmbed.image);
            if (updatedEmbed.footer) ticketEmbed.setFooter({ text: updatedEmbed.footer });

            if (!updatedEmbed.title && !updatedEmbed.description) {
              ticketEmbed
                .setTitle("🎫 Support Ticket")
                .setDescription("Click the button below to create a support ticket. Our staff will assist you shortly.");
            }

            const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(`ticket-setup-${guildId}-${updatedOpenCategory}`)
                .setLabel("Create Ticket")
                .setStyle(ButtonStyle.Success)
            );

            await botMessage.edit({ embeds: [ticketEmbed], components: [button] });
          }
        }
      }
    } catch (editErr) {
      client.logger.warn("AdminTicketAPI", `Failed to update embed in channel: ${editErr}`);
    }

    return reply.send({ success: true, message: "Ticket setup updated." });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to update ticket setup." });
  }
}

export async function deleteAllTicketData(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId } = req.body as { userId: string; guildId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId) return reply.code(400).send({ error: "guildId is required." });

  try {
    const setup = await client.db.TicketSetup.get(guildId);
    if (setup?.messageId && setup?.channelId) {
      try {
        const guild = await fetchGuildWithChannels(client, guildId);
        if (guild) {
          const channel = guild.channels.cache.get(setup.channelId) as TextChannel | undefined;
          if (channel) {
            const msg = await channel.messages.fetch(setup.messageId).catch(() => null);
            if (msg) await msg.delete().catch(() => {});
          }
        }
      } catch { /* best effort */ }
    }

    await client.db.TicketSetup.delete(guildId);

    return reply.send({ success: true, message: "All ticket data deleted for this guild." });
  } catch (err) {
    client.logger.error("AdminTicketAPI", String(err));
    return reply.code(500).send({ error: "Failed to delete all ticket data." });
  }
}

export async function postHelpdeskSend(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId, channelId } = req.body as {
    userId: string;
    guildId: string;
    channelId: string;
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId || !channelId)
    return reply.code(400).send({ error: "guildId and channelId are required." });

  try {
    const cfg = client.config as any;
    if (!cfg.HELPDESK?.Enable) {
      return reply.code(400).send({ error: "Helpdesk is disabled in bot config." });
    }

    const guild = await fetchGuildWithChannels(client, guildId);
    if (!guild) return reply.code(404).send({ error: "Guild not found." });

    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText || !channel.viewable) {
      return reply.code(400).send({ error: "Invalid or non-viewable text channel." });
    }

    const lang = "en";
    const botName = client.user!.username;

    const embed1 = new EmbedBuilder()
      .setAuthor({ name: client.i18n.get(lang, "events.helpdesk", "embed1_title", { bot: botName }) })
      .setDescription(client.i18n.get(lang, "events.helpdesk", "embed1_desc", { bot: botName }))
      .setFooter({ text: client.i18n.get(lang, "events.helpdesk", "embed1_footer", { bot: botName }) })
      .setColor(cfg.color_main ?? 0x5865f2);

    const embed2 = new EmbedBuilder()
      .setAuthor({ name: client.i18n.get(lang, "events.helpdesk", "embed2_title", { bot: botName }) })
      .setDescription(
        client.i18n.get(lang, "events.helpdesk", "embed2_desc", {
          bot: botName,
          button1: cfg.HELPDESK.EMOJI1, button2: cfg.HELPDESK.EMOJI2,
          button3: cfg.HELPDESK.EMOJI3, button4: cfg.HELPDESK.EMOJI4,
          button5: cfg.HELPDESK.EMOJI5, button6: cfg.HELPDESK.EMOJI6,
          button7: cfg.HELPDESK.EMOJI7, button8: cfg.HELPDESK.EMOJI8,
          button9: cfg.HELPDESK.EMOJI9, button10: cfg.HELPDESK.EMOJI10,
        })
      )
      .addFields(
        { name: client.i18n.get(lang, "events.helpdesk", "embed2_field1_name"), value: client.i18n.get(lang, "events.helpdesk", "embed2_field1_value", { website: cfg.HELPDESK.WEBSITE_URL }), inline: true },
        { name: client.i18n.get(lang, "events.helpdesk", "embed2_field2_name"), value: client.i18n.get(lang, "events.helpdesk", "embed2_field2_value"), inline: true },
        { name: client.i18n.get(lang, "events.helpdesk", "embed2_field3_name"), value: client.i18n.get(lang, "events.helpdesk", "embed2_field3_value", { vote: `https://top.gg/bot/${client.user?.id}/vote`, premium: cfg.HELPDESK.PREMIUM_URL }), inline: true }
      )
      .setColor(cfg.color_main ?? 0x5865f2);

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...[1, 2, 3, 4, 5].map((n) =>
        new ButtonBuilder().setCustomId(`helpdesk${n}`).setStyle(ButtonStyle.Secondary).setEmoji(cfg.HELPDESK[`EMOJI${n}`])
      )
    );
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...[6, 7, 8, 9, 10].map((n) =>
        new ButtonBuilder().setCustomId(`helpdesk${n}`).setStyle(ButtonStyle.Secondary).setEmoji(cfg.HELPDESK[`EMOJI${n}`])
      )
    );

    const sentMsg = await (channel as TextChannel).send({ embeds: [embed1, embed2], components: [row1, row2] });

    // Save to database
    await client.db.HelpdeskDeploy.set(`${guildId}-${channelId}`, {
      guildId,
      channelId,
      messageId: sentMsg.id,
      enabled: true,
    });

    return reply.send({ success: true, message: "Helpdesk embed deployed successfully." });
  } catch (err) {
    client.logger.error("AdminHelpdeskAPI", String(err));
    return reply.code(500).send({ error: "Failed to send helpdesk embed." });
  }
}

export async function postHelperSend(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, guildId, channelId } = req.body as {
    userId: string;
    guildId: string;
    channelId: string;
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!guildId || !channelId)
    return reply.code(400).send({ error: "guildId and channelId are required." });

  try {
    const cfg = client.config as any;
    if (!cfg.HELPER_SETUP?.Enable) {
      return reply.code(400).send({ error: "Helper Setup is disabled in bot config." });
    }

    const guild = await fetchGuildWithChannels(client, guildId);
    if (!guild) return reply.code(404).send({ error: "Guild not found." });

    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText || !channel.viewable) {
      return reply.code(400).send({ error: "Invalid or non-viewable text channel." });
    }

    const lang = "en";
    const AboutButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("rule").setLabel(cfg.HELPER_SETUP.NAME1).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("role").setLabel(cfg.HELPER_SETUP.NAME2).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("support-us").setLabel(cfg.HELPER_SETUP.NAME3).setStyle(ButtonStyle.Secondary)
    );

    const sentMsg = await (channel as TextChannel).send({
      content: client.i18n.get(lang, "events.helper", "setup_helper_content", {
        bot: `<@${client.user!.id}>`,
        bots: client.user!.username,
        guild: guild.name,
        serversupport: cfg.HELPER_SETUP.SERVER_SUPPORT_URL,
      }),
      components: [AboutButton],
    });

    // Save to database
    await client.db.HelperDeploy.set(`${guildId}-${channelId}`, {
      guildId,
      channelId,
      messageId: sentMsg.id,
      enabled: true,
    });

    return reply.send({ success: true, message: "Helper message deployed successfully." });
  } catch (err) {
    client.logger.error("AdminHelpdeskAPI", String(err));
    return reply.code(500).send({ error: "Failed to send helper message." });
  }
}

export async function getHelpdeskConfig(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = req.query as { userId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    const all = Array.from(await client.db.HelpdeskDeploy.all());
    const data = all.map((e: any) => {
      const v = e.value ?? e.data ?? e;
      return { id: e.id, ...v };
    });
    return reply.send({ success: true, data });
  } catch (err) {
    client.logger.error("AdminHelpdeskAPI", String(err));
    return reply.code(500).send({ error: "Failed to fetch helpdesk config." });
  }
}

export async function deleteHelpdeskDeploy(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, deployId } = req.body as { userId: string; deployId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!deployId) return reply.code(400).send({ error: "deployId is required." });

  try {
    const record = await client.db.HelpdeskDeploy.get(deployId);
    if (record) {
      const r = record as any;
      try {
        const guild = await fetchGuildWithChannels(client, r.guildId);
        if (guild) {
          const channel = guild.channels.cache.get(r.channelId);
          if (channel && channel.type === ChannelType.GuildText) {
            const msg = await (channel as TextChannel).messages.fetch(r.messageId).catch(() => null);
            if (msg && msg.deletable) await msg.delete().catch(() => null);
          }
        }
      } catch (_) { /* ignore Discord errors */ }
      await client.db.HelpdeskDeploy.delete(deployId);
    }
    return reply.send({ success: true, message: "Helpdesk deploy deleted." });
  } catch (err) {
    client.logger.error("AdminHelpdeskAPI", String(err));
    return reply.code(500).send({ error: "Failed to delete helpdesk deploy." });
  }
}

export async function getHelperConfig(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = req.query as { userId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    const all = Array.from(await client.db.HelperDeploy.all());
    const data = all.map((e: any) => {
      const v = e.value ?? e.data ?? e;
      return { id: e.id, ...v };
    });
    return reply.send({ success: true, data });
  } catch (err) {
    client.logger.error("AdminHelpdeskAPI", String(err));
    return reply.code(500).send({ error: "Failed to fetch helper config." });
  }
}

export async function deleteHelperDeploy(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, deployId } = req.body as { userId: string; deployId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });
  if (!deployId) return reply.code(400).send({ error: "deployId is required." });

  try {
    const record = await client.db.HelperDeploy.get(deployId);
    if (record) {
      const r = record as any;
      try {
        const guild = await fetchGuildWithChannels(client, r.guildId);
        if (guild) {
          const channel = guild.channels.cache.get(r.channelId);
          if (channel && channel.type === ChannelType.GuildText) {
            const msg = await (channel as TextChannel).messages.fetch(r.messageId).catch(() => null);
            if (msg && msg.deletable) await msg.delete().catch(() => null);
          }
        }
      } catch (_) { /* ignore Discord errors */ }
      await client.db.HelperDeploy.delete(deployId);
    }
    return reply.send({ success: true, message: "Helper deploy deleted." });
  } catch (err) {
    client.logger.error("AdminHelpdeskAPI", String(err));
    return reply.code(500).send({ error: "Failed to delete helper deploy." });
  }
}
