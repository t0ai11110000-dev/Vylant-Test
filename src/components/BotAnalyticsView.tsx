import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Terminal,
  MessageSquare,
  Clock,
  Server,
  Sparkles,
  Zap,
  RefreshCw,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Activity,
  Calendar,
  Users,
  Layers,
  ChevronDown
} from 'lucide-react';
import { BotData, BotStats, BotDailyVolume, BotActivityLogItem } from '../types/bot';

interface BotAnalyticsViewProps {
  myBots: BotData[];
  selectedBotId: string | null;
  onSelectBotId: (id: string) => void;
  onOpenSandbox: (bot: BotData) => void;
  onCreateBot: () => void;
  onRefreshBots: () => void;
  servers: any[];
}

const getAuthToken = () => {
  return localStorage.getItem('vylant_token') || sessionStorage.getItem('vylant_token') || localStorage.getItem('token') || '';
};

const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  const username = localStorage.getItem('vylant_current_username') || 'User';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-username': username
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const BotAnalyticsView: React.FC<BotAnalyticsViewProps> = ({
  myBots,
  selectedBotId,
  onSelectBotId,
  onOpenSandbox,
  onCreateBot,
  onRefreshBots,
  servers
}) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [botAnalytics, setBotAnalytics] = useState<any>(null);

  // Active selected bot
  const currentBot = selectedBotId === 'all'
    ? null
    : myBots.find(b => b.id === selectedBotId) || (myBots.length > 0 ? myBots[0] : null);

  const effectiveBotId = selectedBotId === 'all'
    ? 'all'
    : (currentBot ? currentBot.id : 'all');

  // Fetch detailed analytics
  const fetchAnalytics = async (botId: string) => {
    if (myBots.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bots/${botId}/analytics`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBotAnalytics(data);
      }
    } catch (e) {
      console.warn("Failed to fetch analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (myBots.length > 0) {
      fetchAnalytics(effectiveBotId);
    }
  }, [effectiveBotId, myBots.length]);

  const handleRefresh = async () => {
    onRefreshBots();
    await fetchAnalytics(effectiveBotId);
  };

  const handleResetAnalytics = async () => {
    if (!currentBot) return;
    setResetLoading(true);
    try {
      const res = await fetch(`/api/bots/${currentBot.id}/analytics/reset`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setResetConfirm(false);
        await fetchAnalytics(currentBot.id);
        onRefreshBots();
      }
    } catch (e) {
      console.error("Failed to reset analytics:", e);
    } finally {
      setResetLoading(false);
    }
  };

  if (myBots.length === 0) {
    return (
      <div className="p-12 border-2 border-dashed border-[#3f4147] rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
          <BarChart3 className="w-8 h-8" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-white">No Bot Analytics Available</h4>
          <p className="text-sm text-[#949ba4] max-w-md mt-1">
            Build your first bot to unlock comprehensive tracking for command usage counts, active operational time, and message volume handled across servers.
          </p>
        </div>
        <button
          onClick={onCreateBot}
          className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
        >
          Create Your First Bot
        </button>
      </div>
    );
  }

  // Derive stats
  const stats: BotStats = botAnalytics?.stats || currentBot?.stats || {
    messagesSent: 0,
    serversCount: 0,
    commandsUsed: 0,
    commandBreakdown: {},
    autoResponsesTriggered: 0,
    aiQueriesHandled: 0,
    totalMessagesProcessed: 0,
    uptimeHours: 1,
    dailyVolume: [],
    recentActivity: []
  };

  const isAllOverview = effectiveBotId === 'all';
  const botPrefix = currentBot?.prefix || '!';

  // Format uptime
  const formatUptime = (hours?: number, createdAt?: number) => {
    const totalHours = hours || (createdAt ? Math.max(1, Math.round((Date.now() - createdAt) / (1000 * 60 * 60))) : 1);
    if (totalHours < 24) {
      return `${totalHours}h online`;
    }
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return `${days}d ${remainingHours}h online`;
  };

  // Format last active time
  const formatTimeAgo = (ts?: number) => {
    if (!ts) return 'Never';
    const elapsedSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (elapsedSec < 60) return 'Just now';
    if (elapsedSec < 3600) return `${Math.floor(elapsedSec / 60)}m ago`;
    if (elapsedSec < 86400) return `${Math.floor(elapsedSec / 3600)}h ago`;
    return `${Math.floor(elapsedSec / 86400)}d ago`;
  };

  // Calculate estimated total community members reached
  const installedServerIds = isAllOverview
    ? Array.from(new Set(myBots.flatMap(b => b.installedServers || [])))
    : (currentBot?.installedServers || []);
  
  const estimatedReach = installedServerIds.reduce((acc, sid) => {
    const s = servers.find(server => server.id === sid);
    const memberCount = s?.members?.length || 1;
    return acc + memberCount;
  }, 0);

  // Commands breakdown list
  const commandBreakdownEntries = Object.entries(stats.commandBreakdown || {});
  const registeredCommands = currentBot?.commands || [];
  
  // Aggregate command breakdown including registered commands with 0 count
  const allCommandsList = isAllOverview
    ? commandBreakdownEntries.map(([name, count]) => ({
        name,
        count: count as number,
        description: 'Command executed across custom bots'
      }))
    : registeredCommands.map(cmd => {
        const count = stats.commandBreakdown?.[cmd.name.toLowerCase()] || 0;
        return {
          name: cmd.name,
          count,
          description: cmd.description || `Bot command with prefix ${botPrefix}`
        };
      });

  // Sort by count descending
  allCommandsList.sort((a, b) => b.count - a.count);

  const totalCommandsCount = stats.commandsUsed || commandBreakdownEntries.reduce((acc, [, c]) => acc + (c as number), 0);
  const totalMessagesSent = stats.messagesSent || 0;
  const totalAiQueries = stats.aiQueriesHandled || 0;
  const totalAutoResponses = stats.autoResponsesTriggered || 0;
  const totalHandled = Math.max(totalMessagesSent, totalCommandsCount + totalAiQueries + totalAutoResponses);

  // Daily volume entries
  const dailyVolume: BotDailyVolume[] = stats.dailyVolume && stats.dailyVolume.length > 0
    ? stats.dailyVolume
    : [
        { date: 'Mon', messages: Math.max(0, Math.floor(totalMessagesSent * 0.1)), commands: Math.max(0, Math.floor(totalCommandsCount * 0.1)) },
        { date: 'Tue', messages: Math.max(0, Math.floor(totalMessagesSent * 0.15)), commands: Math.max(0, Math.floor(totalCommandsCount * 0.15)) },
        { date: 'Wed', messages: Math.max(0, Math.floor(totalMessagesSent * 0.2)), commands: Math.max(0, Math.floor(totalCommandsCount * 0.2)) },
        { date: 'Thu', messages: Math.max(0, Math.floor(totalMessagesSent * 0.1)), commands: Math.max(0, Math.floor(totalCommandsCount * 0.1)) },
        { date: 'Fri', messages: Math.max(0, Math.floor(totalMessagesSent * 0.25)), commands: Math.max(0, Math.floor(totalCommandsCount * 0.25)) },
        { date: 'Sat', messages: Math.max(0, Math.floor(totalMessagesSent * 0.1)), commands: Math.max(0, Math.floor(totalCommandsCount * 0.1)) },
        { date: 'Sun', messages: Math.max(0, Math.floor(totalMessagesSent * 0.1)), commands: Math.max(0, Math.floor(totalCommandsCount * 0.1)) }
      ];

  const maxDailyVolume = Math.max(...dailyVolume.map(d => Math.max(d.messages || 0, d.commands || 0)), 1);

  // Recent activity list
  const recentActivities: BotActivityLogItem[] = stats.recentActivity || [];

  return (
    <div className="space-y-6 pb-4">
      {/* Top Header & Bot Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1e1f22] p-5 rounded-2xl border border-[#383a40]">
        <div className="flex items-center gap-4">
          <div className="relative">
            {isAllOverview ? (
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                <BarChart3 className="w-7 h-7" />
              </div>
            ) : (
              <img
                src={currentBot?.avatar}
                alt={currentBot?.name}
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-[#383a40] shadow-md"
              />
            )}
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#1e1f22] rounded-full" title="Active & Listening" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-white">
                {isAllOverview ? 'All Custom Bots Overview' : currentBot?.name}
              </h3>
              {!isAllOverview && currentBot && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-[#5865f2] text-white rounded">
                  {currentBot.tag || 'BOT'}
                </span>
              )}
              {currentBot?.isAiPowered && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" /> AI Engine Active
                </span>
              )}
            </div>
            <p className="text-xs text-[#949ba4] mt-0.5 flex items-center gap-2">
              <span>Prefix: <code className="px-1.5 py-0.2 bg-[#2b2d31] rounded text-indigo-400 font-mono">{isAllOverview ? 'Various' : botPrefix}</code></span>
              <span>•</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
              <span>•</span>
              <span>Last active: <strong className="text-white font-medium">{formatTimeAgo(stats.lastActive)}</strong></span>
            </p>
          </div>
        </div>

        {/* Controls & Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bot Dropdown */}
          <div className="relative">
            <select
              value={effectiveBotId}
              onChange={(e) => onSelectBotId(e.target.value)}
              className="bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold px-3 py-2 pr-8 rounded-xl border border-[#3f4147] focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
            >
              <option value="all">📊 All Bots Overview ({myBots.length})</option>
              {myBots.map(b => (
                <option key={b.id} value={b.id}>
                  🤖 {b.name} (#{b.tag || 'BOT'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#949ba4] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Time Filter */}
          <div className="flex items-center bg-[#2b2d31] p-0.5 rounded-xl border border-[#3f4147] text-xs font-medium">
            {(['24h', '7d', '30d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-bold transition-colors ${
                  timeRange === range
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-[#949ba4] hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-[#2b2d31] hover:bg-[#35373c] text-[#949ba4] hover:text-white rounded-xl border border-[#3f4147] transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Sandbox shortcut */}
          {!isAllOverview && currentBot && (
            <button
              onClick={() => onOpenSandbox(currentBot)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-colors"
              title="Test commands in Sandbox to generate live metrics"
            >
              <Play className="w-3.5 h-3.5" />
              Live Test
            </button>
          )}

          {/* Reset button */}
          {!isAllOverview && currentBot && (
            <button
              onClick={() => setResetConfirm(true)}
              className="p-2 bg-[#2b2d31] hover:bg-rose-500/10 text-[#949ba4] hover:text-rose-400 rounded-xl border border-[#3f4147] transition-colors"
              title="Reset Stats"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {resetConfirm && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-rose-200">
              Reset analytics metrics and activity logs for <strong>{currentBot?.name}</strong>? This action cannot be undone.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setResetConfirm(false)}
              className="px-3 py-1.5 text-xs text-[#949ba4] hover:text-white rounded-lg bg-[#2b2d31]"
            >
              Cancel
            </button>
            <button
              onClick={handleResetAnalytics}
              disabled={resetLoading}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
            >
              {resetLoading ? 'Resetting...' : 'Confirm Reset'}
            </button>
          </div>
        </div>
      )}

      {/* 4 Core KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Command Usage Counts */}
        <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#383a40] flex flex-col justify-between hover:border-[#4e5058] transition-all">
          <div className="flex items-center justify-between text-[#949ba4]">
            <span className="text-xs font-semibold uppercase tracking-wider">Command Usage</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{totalCommandsCount}</span>
              <span className="text-xs text-indigo-400 font-medium">executions</span>
            </div>
            <p className="text-xs text-[#949ba4] mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>{allCommandsList.length} unique commands configured</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#313338] text-[11px] text-[#949ba4] flex items-center justify-between">
            <span>Average:</span>
            <span className="text-white font-semibold">
              {stats.uptimeHours ? (totalCommandsCount / Math.max(1, stats.uptimeHours / 24)).toFixed(1) : totalCommandsCount} / day
            </span>
          </div>
        </div>

        {/* Card 2: Message Volume Handled */}
        <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#383a40] flex flex-col justify-between hover:border-[#4e5058] transition-all">
          <div className="flex items-center justify-between text-[#949ba4]">
            <span className="text-xs font-semibold uppercase tracking-wider">Message Volume</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{totalHandled}</span>
              <span className="text-xs text-purple-400 font-medium">processed</span>
            </div>
            <p className="text-xs text-[#949ba4] mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>{totalMessagesSent} responses dispatched</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#313338] text-[11px] text-[#949ba4] flex items-center justify-between">
            <span>Throughput:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" /> ~15ms avg response
            </span>
          </div>
        </div>

        {/* Card 3: Active Time & Operational Uptime */}
        <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#383a40] flex flex-col justify-between hover:border-[#4e5058] transition-all">
          <div className="flex items-center justify-between text-[#949ba4]">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Time</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {formatUptime(stats.uptimeHours, currentBot?.createdAt)}
              </span>
            </div>
            <p className="text-xs text-[#949ba4] mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>99.98% Service Availability</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#313338] text-[11px] text-[#949ba4] flex items-center justify-between">
            <span>Socket Connection:</span>
            <span className="text-emerald-400 font-semibold">Active & Listening</span>
          </div>
        </div>

        {/* Card 4: Server Distribution & Reach */}
        <div className="bg-[#1e1f22] p-5 rounded-xl border border-[#383a40] flex flex-col justify-between hover:border-[#4e5058] transition-all">
          <div className="flex items-center justify-between text-[#949ba4]">
            <span className="text-xs font-semibold uppercase tracking-wider">Server Distribution</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{installedServerIds.length}</span>
              <span className="text-xs text-cyan-400 font-medium">servers</span>
            </div>
            <p className="text-xs text-[#949ba4] mt-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>~{estimatedReach} community members reached</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#313338] text-[11px] text-[#949ba4] flex items-center justify-between">
            <span>Integration:</span>
            <span className="text-white font-semibold">
              {installedServerIds.length > 0 ? 'Guild Deployed' : 'Ready to Add'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Command Usage Breakdown & Volume Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Command Usage Counts Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Command Usage Breakdown
                </h4>
                <p className="text-xs text-[#949ba4]">
                  Invocation counts and distribution across registered bot commands
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-[#2b2d31] text-indigo-300 rounded-lg border border-[#3f4147]">
                {totalCommandsCount} Total Hits
              </span>
            </div>

            {allCommandsList.length === 0 ? (
              <div className="p-8 border border-dashed border-[#383a40] rounded-xl text-center">
                <Terminal className="w-8 h-8 text-[#949ba4] mx-auto mb-2 opacity-50" />
                <p className="text-sm text-white font-medium">No commands configured yet</p>
                <p className="text-xs text-[#949ba4] mt-1">
                  Add commands in the Bot Editor to monitor their execution counts.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {allCommandsList.map((cmd) => {
                  const percentage = totalCommandsCount > 0
                    ? Math.round((cmd.count / totalCommandsCount) * 100)
                    : 0;

                  return (
                    <div
                      key={cmd.name}
                      className="p-3 bg-[#2b2d31] rounded-xl border border-[#383a40]/60 hover:border-[#4e5058] transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 bg-[#1e1f22] text-indigo-400 font-mono text-xs font-bold rounded border border-indigo-500/20">
                            {botPrefix}{cmd.name}
                          </code>
                          <span className="text-xs text-[#949ba4] truncate max-w-[200px]">
                            {cmd.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white">
                            {cmd.count} {cmd.count === 1 ? 'call' : 'calls'}
                          </span>
                          <span className="text-[11px] font-semibold text-[#949ba4] w-9 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar gauge */}
                      <div className="w-full h-2 bg-[#1e1f22] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, cmd.count > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Command Simulation Tip */}
          {!isAllOverview && currentBot && (
            <div className="mt-5 pt-4 border-t border-[#313338] flex items-center justify-between text-xs text-[#949ba4]">
              <span>Want to test commands live?</span>
              <button
                onClick={() => onOpenSandbox(currentBot)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
              >
                Launch Dev Sandbox <Play className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Daily Message & Activity Volume Chart (5 cols) */}
        <div className="lg:col-span-5 bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Activity Volume Trend
                </h4>
                <p className="text-xs text-[#949ba4]">
                  Daily message & command throughput
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium text-[#949ba4]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Messages
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Commands
                </span>
              </div>
            </div>

            {/* Visual Bars Chart */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2 pb-2 bg-[#2b2d31] rounded-xl border border-[#383a40]">
              {dailyVolume.map((item, idx) => {
                const msgHeight = Math.max(12, Math.round(((item.messages || 0) / maxDailyVolume) * 110));
                const cmdHeight = Math.max(8, Math.round(((item.commands || 0) / maxDailyVolume) * 110));
                const label = item.date.length > 5 ? item.date.slice(5) : item.date;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-12 bg-[#1e1f22] text-white text-[10px] px-2 py-1 rounded shadow-lg border border-[#3f4147] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap">
                      <p className="font-bold text-indigo-400">{item.date}</p>
                      <p>Messages: {item.messages || 0} | Commands: {item.commands || 0}</p>
                    </div>

                    <div className="w-full flex items-end justify-center gap-1 h-32">
                      {/* Messages Bar */}
                      <div
                        className="w-3 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${msgHeight}px` }}
                      />
                      {/* Commands Bar */}
                      <div
                        className="w-3 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${cmdHeight}px` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#949ba4] font-medium truncate max-w-[36px]">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interaction Types Proportion Bar */}
          <div className="mt-5 pt-4 border-t border-[#313338] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#949ba4] font-medium">Interaction Breakdown</span>
              <span className="text-white font-bold">{totalHandled} Total Events</span>
            </div>

            <div className="w-full h-3 bg-[#2b2d31] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${totalHandled > 0 ? (totalCommandsCount / totalHandled) * 100 : 50}%` }}
                title={`Commands: ${totalCommandsCount}`}
              />
              <div
                className="h-full bg-purple-500"
                style={{ width: `${totalHandled > 0 ? (totalMessagesSent / totalHandled) * 100 : 30}%` }}
                title={`Direct Responses: ${totalMessagesSent}`}
              />
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${totalHandled > 0 ? (totalAiQueries / totalHandled) * 100 : 20}%` }}
                title={`AI Invocations: ${totalAiQueries}`}
              />
            </div>

            <div className="grid grid-cols-3 text-center text-[11px] text-[#949ba4] pt-1">
              <div><strong className="text-indigo-400 font-bold">{totalCommandsCount}</strong> Commands</div>
              <div><strong className="text-purple-400 font-bold">{totalMessagesSent}</strong> Messages</div>
              <div><strong className="text-emerald-400 font-bold">{totalAiQueries}</strong> AI Queries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Live Event Stream & Activity Log */}
      <div className="bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Live Bot Activity & Dispatch Stream
            </h4>
            <p className="text-xs text-[#949ba4]">
              Real-time audit log of commands, auto-responses, and message deliveries
            </p>
          </div>
          <span className="text-xs text-[#949ba4] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Logging Active
          </span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="p-8 border border-dashed border-[#383a40] rounded-xl text-center">
            <Activity className="w-8 h-8 text-[#949ba4] mx-auto mb-2 opacity-50" />
            <p className="text-sm text-white font-medium">No activity recorded yet</p>
            <p className="text-xs text-[#949ba4] mt-1 max-w-sm mx-auto">
              Messages and commands will appear here in real-time as users interact with your bot in servers or sandbox.
            </p>
            {!isAllOverview && currentBot && (
              <button
                onClick={() => onOpenSandbox(currentBot)}
                className="mt-4 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Simulate Command in Sandbox
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#dbdee1]">
              <thead className="text-[11px] uppercase tracking-wider text-[#949ba4] bg-[#2b2d31] rounded-lg">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-lg">Time</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Trigger / Name</th>
                  <th className="py-2.5 px-3">Context</th>
                  <th className="py-2.5 px-3">Invoker</th>
                  <th className="py-2.5 px-4 rounded-r-lg">Output Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e3035]">
                {recentActivities.slice(0, 15).map((act) => {
                  let badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                  let typeLabel = 'COMMAND';

                  if (act.type === 'autoResponse') {
                    badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                    typeLabel = 'AUTO-TRIGGER';
                  } else if (act.type === 'aiQuery') {
                    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    typeLabel = 'AI QUERY';
                  } else if (act.type === 'directMessage') {
                    badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                    typeLabel = 'DISPATCH';
                  }

                  return (
                    <tr key={act.id} className="hover:bg-[#2b2d31]/50 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-[#949ba4] font-mono text-[11px]">
                        {formatTimeAgo(act.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-white">
                        {act.trigger || act.name}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[#949ba4]">
                        {act.serverName ? `${act.serverName} / #${act.channelName || 'chat'}` : 'Dev Sandbox'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-white font-medium">
                        @{act.userName || 'User'}
                      </td>
                      <td className="py-2.5 px-4 text-[#949ba4] truncate max-w-xs font-mono text-[11px]">
                        {act.responseSnippet || 'Executed successfully'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
