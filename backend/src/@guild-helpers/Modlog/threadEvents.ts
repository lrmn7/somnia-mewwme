import {
  ThreadChannel,
  EmbedBuilder,
  ThreadMember,
  AnyThreadChannel,
  PartialThreadMember,
  ReadonlyCollection,
} from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class ThreadEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("threadCreate", this.handleThreadCreate.bind(this));
    this.client.on("threadDelete", this.handleThreadDelete.bind(this));
    this.client.on("threadUpdate", this.handleThreadUpdate.bind(this));
    this.client.on("threadMemberUpdate", this.handleThreadMemberUpdate.bind(this));
    this.client.on("threadAutoArchived", this.handleThreadAutoArchived.bind(this));
    this.client.on("threadUnarchive", this.handleThreadUnarchive.bind(this));
    this.client.on("threadMembersUpdate", this.handleThreadMembersUpdate.bind(this)); // Fixed event handler
  }

  private async handleThreadCreate(thread: ThreadChannel) {
    if (!(await isEventEnabled(thread.guild.id, "threadCreate", this.client.db))) return;

    const channel = await getModLogChannel(thread.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32)
          .setTitle("🧵 Thread Created")
          .setDescription(`**Thread:** ${thread.name} (${thread.id})`)
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleThreadDelete(thread: ThreadChannel) {
    if (!(await isEventEnabled(thread.guild.id, "threadDelete", this.client.db))) return;

    const channel = await getModLogChannel(thread.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setTitle("🗑️ Thread Deleted")
          .setDescription(`**Thread:** ${thread.name} (${thread.id})`)
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleThreadUpdate(oldThread: ThreadChannel, newThread: ThreadChannel) {
    if (!(await isEventEnabled(newThread.guild.id, "threadUpdate", this.client.db))) return;

    const changes: string[] = [];
    if (oldThread.name !== newThread.name) {
      changes.push(`**Name:** ${oldThread.name} → ${newThread.name}`);
    }

    if (changes.length > 0) {
      const channel = await getModLogChannel(newThread.guild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("🛠️ Thread Updated")
            .setDescription(changes.join("\n"))
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  private async handleThreadMemberUpdate(oldMember: any, newMember: any) {
    if (!(await isEventEnabled(newMember.guild.id, "threadMemberUpdate", this.client.db))) return;

    const channel = await getModLogChannel(newMember.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("🛠️ Thread Member Updated")
          .setDescription(`**Member:** <@${newMember.id}>`)
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleThreadAutoArchived(thread: ThreadChannel) {
    if (!(await isEventEnabled(thread.guild.id, "threadAutoArchived", this.client.db))) return;

    const channel = await getModLogChannel(thread.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle("📁 Thread Auto-Archived")
          .setDescription(`**Thread:** ${thread.name} (${thread.id})`)
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleThreadUnarchive(thread: ThreadChannel) {
    if (!(await isEventEnabled(thread.guild.id, "threadUnarchive", this.client.db))) return;

    const channel = await getModLogChannel(thread.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32)
          .setTitle("📂 Thread Unarchived")
          .setDescription(`**Thread:** ${thread.name} (${thread.id}) was unarchived.`)
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle bulk thread member updates
  private async handleThreadMembersUpdate(
    addedMembers: ReadonlyCollection<string, ThreadMember<boolean>>,
    removedMembers: ReadonlyCollection<string, ThreadMember<boolean> | PartialThreadMember>,
    thread: AnyThreadChannel
  ) {
    if (!(await isEventEnabled(thread.guild.id, "threadMembersUpdate", this.client.db))) return;

    const logChannel = await getModLogChannel(thread.guild.id, this.client);
    if (!logChannel) return;

    const changes: string[] = [];
    if (addedMembers.size > 0) {
      changes.push(
        `**Members Added:** ${[...addedMembers.values()].map((m) => `<@${m.id}>`).join(", ")}`
      );
    }
    if (removedMembers.size > 0) {
      changes.push(
        `**Members Removed:** ${[...removedMembers.values()].map((m) => `<@${m.id}>`).join(", ")}`
      );
    }

    if (changes.length > 0) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("🧵 Thread Members Updated")
            .setDescription(changes.join("\n"))
            .setTimestamp(new Date()),
        ],
      });
    }
  }
}

/**
 *  __  __            Made by Tragic              _
 * |  \/  |   L RMN - https://hi-lrmn.is-a.dev   ( )
 * | \  / | _____      ____      ___ __ ___   ___|/ ___
 * | |\/| |/ _ \ \ /\ / /\ \ /\ / / '_ ` _ \ / _ \ / __|
 * | |  | |  __/\ V  V /  \ V  V /| | | | | |  __/ \__ \
 * |_|  |_|\___| \_/\_/    \_/\_/ |_| |_| |_|\___| |___/
 *
 *     Discord Support: https://meww.me/support
 *     Community Resources: https://meww.me/premium
 */
