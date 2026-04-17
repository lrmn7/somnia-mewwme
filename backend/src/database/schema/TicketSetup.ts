export interface TicketActiveData {
  ticketCount: number;
  userId: string;
  Username: string;
  ChannelId: string;
}

export interface TicketHistoryEntry {
  ticketCount: number;
  guildId: string;
  userId: string;
  Username: string;
  ChannelId: string;
  reason: string;
  status: "open" | "closed";
  openedAt: number;
  closedAt?: number;
  closedBy?: string;
  transcriptUrl?: string;
}

export interface TicketSetup {
  enabled: boolean;
  guildId: string;
  channelId: string;
  openCategory: string;
  closeCategory: string;
  roleId: string;
  messageId?: string;
  embed?: {
    title?: string;
    description?: string;
    thumbnail?: string;
    image?: string;
    footer?: string;
  };
  ticketCount: number;
  activeTickets: Record<string, TicketActiveData>;
  history: TicketHistoryEntry[];
}
