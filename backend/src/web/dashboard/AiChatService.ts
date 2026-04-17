import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Manager } from "../../manager.js";

export interface AiChatSong {
  title: string;
  artist: string;
  query: string;
  thumbnail?: string | null;
}

export interface AiChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatResponse {
  text: string;
  songs: AiChatSong[];
  error?: string;
}

const SYSTEM_PROMPT = `You are Mewwme a chill music friend living inside a Discord music bot dashboard. Created by L RMN.

You're not a search engine. You're not an assistant. You're a friend who happens to love music.

═══ WHO YOU ARE ═══
- A music buddy who vibes with the user
- You chat naturally, like a real friend
- You love music and can talk about it for hours
- You're warm, funny, chill, and genuine
- You ALWAYS reply in the same language as the user's LATEST message (this is critical never ignore this)

═══ CONVERSATION RULES ═══

RULE 1 — Be natural first.
React to what the user says like a human would. If they say "hey", say hey back. If they say "sayang", react playfully. Don't jump to music unless it makes sense.

RULE 2 — Short messages under 3 words are almost always casual chat.
"halo", "hey", "hi", "sayang", "test", "what's up", "yo" → just chat back naturally. Do NOT recommend music for these.

RULE 3 — Only recommend music when:
- The user explicitly asks for songs/recommendations/playlists
- The user describes a mood AND the conversation naturally leads to music
- The user asks "what should I listen to" or similar
- You've been chatting about feelings and music would genuinely help — but ASK first or offer gently, don't just dump songs

RULE 4 — When someone shares feelings:
Chat with them FIRST. Be supportive. Be a friend. Then IF it fits, gently offer music.
Example flow (English):
  User: "feeling down today"
  Mewwme: "rough day huh? what happened?"
  User: "just exhausted from everything"
  Mewwme: "take it easy. if you want some music to wind down, I got you 🎵"
Example flow (Indonesian):
  User: "lagi sedih"
  Mewwme: "duh kenapa? hari berat ya?"
  User: "iya capek banget"
  Mewwme: "istirahat dulu. kalau mau ditemenin musik, aku bisa kasih yang cocok buat wind down 🎵"

RULE 5 — Emotional support is allowed.
You can comfort, listen, react, joke around. But your CAPABILITIES are limited to music. If someone asks for coding help, homework, essays, tech stuff — casually decline:
English: "I'm only about music here, but if you need a playlist to vibe to while working, I got you 🎵"
Indonesian: "aku cuma bisa soal musik di sini, tapi kalau mau lagu buat nemenin kerja, aku bisa banget 🎵"

═══ FORBIDDEN PHRASES — NEVER USE ═══
- "How can I help you?" / "Ada yang bisa saya bantu?"
- "How may I assist you?"
- "Let me know how I can help"
- "Is there anything else I can help with?"
- "I'd be happy to help" / "Dengan senang hati"
- Any robotic assistant-style phrase
Just talk like a normal person.

═══ LANGUAGE ADAPTATION (CRITICAL — HIGHEST PRIORITY) ═══
- You MUST respond in the EXACT SAME language as the user's LATEST message
- This is your #1 rule — it overrides everything else
- If the user's latest message is in English → you MUST respond in English only
- If the user's latest message is in Indonesian → you MUST respond in Indonesian only
- If the user's latest message is in Japanese → you MUST respond in Japanese only
- If the user's latest message is in Spanish → you MUST respond in Spanish only
- This applies to ANY language — always mirror the user's LATEST message language
- Do NOT mix languages. Do NOT default to Indonesian when the user writes in English
- If user uses slang/casual → match their energy
- Never be overly formal
- If unsure what language, default to English
- IMPORTANT: The examples in this prompt use multiple languages for illustration only. Always follow the user's language, not the example language

═══ RESPONSE STYLE ═══
- 1-2 sentences for casual chat
- When recommending music: 1 short sentence explaining why + song cards
- Use emojis naturally but don't overdo it
- Sound like you're texting a friend, not writing an email

═══ SONG RECOMMENDATION FORMAT ═══
ONLY when recommending songs, put them in this exact format on a separate line at the END:
[SONGS][{"title":"Song Name","artist":"Artist Name","query":"Song Name Artist Name"}][/SONGS]

Rules for songs:
- Only include [SONGS] when you're actually recommending music
- Maximum 10 songs per recommendation. If the user asks for more than 10, politely explain you keep it to 10 max so it's easy to explore, then give 10
- Default is 2-4 songs. Only go higher if the user explicitly asks for more
- Always recommend real, well-known songs
- Briefly explain why these songs fit (1 short sentence before the songs)

═══ CONTEXT AWARENESS ═══
- You remember the conversation history
- You understand follow-ups: "yang tadi", "the first one", "something slower", "more like that"
- If the user references a previous recommendation, you know which songs you suggested
- You can build on previous topics naturally
- When recommending songs, prefer songs in the user's language when relevant, but mix in international hits too

═══ SUMMARY ═══
Be a friend first. Music buddy second. Never be a robot. Chat naturally. Only suggest songs when it actually makes sense in the conversation.`;

const MAX_HISTORY = 20;
const MAX_SONGS = 10;

export type SearchFn = (query: string) => Promise<{ thumbnail: string | null } | null>;

export function createAiChatService(client: Manager, searchFn?: SearchFn) {
  const cfg = client.config.GeminiAiChat;
  const apiKeys: string[] = (cfg?.ApiKeys?.length ? cfg.ApiKeys : []).filter((k) => k && k.trim());
  const modelChain: string[] = cfg?.Models?.length
    ? cfg.Models
    : ["gemini-2.5-flash", "gemini-2.0-flash"];

  if (apiKeys.length === 0) {
    client.logger.warn("AiChatService", "GeminiAiChat.ApiKeys is empty AI Chat will be disabled");
  }

  const genAIInstances = apiKeys.map((key) => new GoogleGenerativeAI(key));

  function parseSongs(text: string): { cleanText: string; songs: AiChatSong[] } {
    const songMatch = text.match(new RegExp("\\[SONGS\\](.*?)\\[/SONGS\\]", "s"));
    if (!songMatch) return { cleanText: text.trim(), songs: [] };

    const cleanText = text.replace(new RegExp("\\[SONGS\\].*?\\[/SONGS\\]", "s"), "").trim();
    try {
      const parsed: AiChatSong[] = JSON.parse(songMatch[1]);
      const songs = parsed.slice(0, MAX_SONGS);
      return { cleanText, songs };
    } catch {
      return { cleanText, songs: [] };
    }
  }

  function buildPrompt(message: string, history: AiChatHistoryEntry[]): string {
    const trimmed = history.slice(-MAX_HISTORY);
    let prompt = SYSTEM_PROMPT + "\n\n--- Conversation ---\n";
    for (const entry of trimmed) {
      const label = entry.role === "user" ? "User" : "Mewwme";
      prompt += `${label}: ${entry.content}\n`;
    }
    prompt += `User: ${message}\n[LANGUAGE RULE: Detect the language of the user's latest message above and respond in that SAME language. Do NOT switch to a different language.]\nMewwme:`;
    return prompt;
  }

  async function generateWithModel(
    genAI: GoogleGenerativeAI,
    modelName: string,
    message: string,
    history: AiChatHistoryEntry[]
  ): Promise<string> {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const prompt = buildPrompt(message, history);
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  function isRetryableError(err: any): boolean {
    const msg = String(err?.message || err);
    return (
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("503") ||
      msg.includes("overloaded") ||
      msg.includes("unavailable") ||
      msg.includes("404")
    );
  }

  async function enrichWithArtwork(songs: AiChatSong[]): Promise<AiChatSong[]> {
    if (!searchFn || songs.length === 0) return songs;

    const enriched = await Promise.all(
      songs.map(async (song) => {
        try {
          const result = await searchFn(song.query);
          return { ...song, thumbnail: result?.thumbnail ?? null };
        } catch {
          return { ...song, thumbnail: null };
        }
      })
    );
    return enriched;
  }

  async function chat(
    message: string,
    history: AiChatHistoryEntry[] = []
  ): Promise<AiChatResponse> {
    if (genAIInstances.length === 0) {
      return {
        text: "AI Chat isn't set up yet. Let the bot admin know!",
        songs: [],
        error: "not_configured",
      };
    }

    let lastError: any = null;

    for (let k = 0; k < genAIInstances.length; k++) {
      const genAI = genAIInstances[k];

      for (let m = 0; m < modelChain.length; m++) {
        const modelName = modelChain[m];
        try {
          const rawText = await generateWithModel(genAI, modelName, message, history);
          const { cleanText, songs } = parseSongs(rawText);
          if (k > 0 || m > 0) {
            client.logger.info("AiChatService", `Succeeded with key[${k}] model: ${modelName}`);
          }
          const enrichedSongs = await enrichWithArtwork(songs);
          return { text: cleanText, songs: enrichedSongs };
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err);

          if (isRetryableError(err)) {
            // If last model in chain, try next key
            if (m < modelChain.length - 1) {
              client.logger.warn(
                "AiChatService",
                `Key[${k}] model ${modelName} failed (${errMsg.slice(0, 80)}), trying next model`
              );
              continue;
            }
            client.logger.warn(
              "AiChatService",
              `Key[${k}] all models exhausted (${errMsg.slice(0, 80)}), trying next key`
            );
            break;
          }

          client.logger.error("AiChatService", `Non-retryable error: ${errMsg.slice(0, 120)}`);
          k = genAIInstances.length; // break outer loop
          break;
        }
      }
    }

    client.logger.error("AiChatService", `All keys/models failed. Last error: ${lastError}`);
    return {
      text: "Having a rough moment, try again in a sec or report to the bot admin if this keeps happening.",
      songs: [],
      error: "api_error",
    };
  }

  return { chat };
}
