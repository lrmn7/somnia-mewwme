import type { QuickDatabasePlus } from "../../structures/QuickDatabasePlus.js";
import type { AiChatHistory, AiChatHistoryMessage } from "../../database/schema/AiChatHistory.js";

const MAX_MESSAGES_PER_USER = 50;

export interface ChatHistoryDisplay {
  id: number;
  role: "user" | "assistant";
  content: string;
  songs: any[];
  createdAt: string;
}

export function createAiChatHistoryDb(db: QuickDatabasePlus<AiChatHistory>) {
  /** Save a message and prune old ones if over limit */
  async function saveMessage(
    userId: string,
    _guildId: string | null,
    role: "user" | "assistant",
    content: string,
    songs?: any[]
  ): Promise<void> {
    const entry: AiChatHistoryMessage = {
      role,
      content,
      songs: songs && songs.length > 0 ? songs : undefined,
      createdAt: Date.now(),
    };

    const existing = await db.get(userId) as AiChatHistory | null;
    if (existing) {
      existing.messages.push(entry);
      // Prune if over limit
      if (existing.messages.length > MAX_MESSAGES_PER_USER) {
        existing.messages = existing.messages.slice(-MAX_MESSAGES_PER_USER);
      }
      await db.set(userId, existing);
    } else {
      await db.set(userId, { userId, messages: [entry] });
    }
  }

  async function getHistory(userId: string, limit: number = 20): Promise<ChatHistoryDisplay[]> {
    const data = await db.get(userId) as AiChatHistory | null;
    if (!data?.messages?.length) return [];

    return data.messages.slice(-limit).map((msg, i) => ({
      id: i,
      role: msg.role,
      content: msg.content,
      songs: msg.songs ?? [],
      createdAt: new Date(msg.createdAt).toISOString(),
    }));
  }

  async function getContext(userId: string, limit: number = 12): Promise<{ role: "user" | "assistant"; content: string }[]> {
    const data = await db.get(userId) as AiChatHistory | null;
    if (!data?.messages?.length) return [];

    return data.messages.slice(-limit).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  async function clearHistory(userId: string): Promise<void> {
    await db.delete(userId);
  }

  return { saveMessage, getHistory, getContext, clearHistory };
}

