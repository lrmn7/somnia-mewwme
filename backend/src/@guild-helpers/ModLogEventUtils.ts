import { TextChannel } from "discord.js";
import { ModLogToggle } from "../database/schema/ModLogToggle.js";

export async function isEventEnabled(
  guildId: string,
  event: keyof ModLogToggle,
  database: any
): Promise<boolean> {
  if (!database || !database.ModLogToggle) {
    return false;
  }

  const toggles = (await database.ModLogToggle.get(guildId)) as ModLogToggle | null;
  if (!toggles) return false;

  return !!toggles[event];
}

export async function getModLogChannel(guildId: string, client: any): Promise<TextChannel | null> {
  if (!client.db || !client.db.ModLogChannel) {
    return null;
  }

  const modLogData = await client.db.ModLogChannel.get(guildId);
  if (!modLogData || !modLogData.channelId) return null;

  return client.channels.cache.get(modLogData.channelId) as TextChannel;
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
