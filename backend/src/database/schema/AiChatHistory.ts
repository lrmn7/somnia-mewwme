export interface AiChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
  songs?: any[];
  createdAt: number;
}

export interface AiChatHistory {
  userId: string;
  messages: AiChatHistoryMessage[];
}
