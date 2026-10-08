export interface BotCommand {
  id: string;
  name: string;
  description: string;
  response: string;
  aliases?: string[];
  cooldown?: number;
}

export interface BotAutoResponse {
  id: string;
  trigger: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  response: string;
}

export interface BotDailyVolume {
  date: string;
  messages: number;
  commands: number;
  aiQueries?: number;
}

export interface BotActivityLogItem {
  id: string;
  timestamp: number;
  type: 'command' | 'autoResponse' | 'aiQuery' | 'directMessage';
  name: string;
  trigger: string;
  serverName?: string;
  channelName?: string;
  userName?: string;
  responseSnippet?: string;
}

export interface BotStats {
  messagesSent: number;
  serversCount: number;
  commandsUsed?: number;
  commandBreakdown?: Record<string, number>;
  autoResponsesTriggered?: number;
  aiQueriesHandled?: number;
  totalMessagesProcessed?: number;
  lastActive?: number;
  uptimeHours?: number;
  dailyVolume?: BotDailyVolume[];
  recentActivity?: BotActivityLogItem[];
}

export interface BotData {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  tag: string;
  token: string;
  avatar: string;
  banner?: string;
  about?: string;
  customStatus?: string;
  prefix: string;
  isPublic: boolean;
  isAiPowered: boolean;
  systemPrompt?: string;
  commands: BotCommand[];
  autoResponses: BotAutoResponse[];
  welcomeMessage?: string;
  installedServers: string[];
  createdAt: number;
  stats: BotStats;
}
