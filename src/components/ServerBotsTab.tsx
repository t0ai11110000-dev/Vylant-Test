import React, { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Terminal,
  Sparkles,
  Send,
  Check,
  Server,
  Key,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Copy,
  RefreshCw,
  X,
  ChevronRight,
  Shield
} from 'lucide-react';
import { BotData } from '../types/bot';

interface ServerBotsTabProps {
  server: any;
  currentUser: any;
  onRefreshServer?: () => void;
  onOpenBotStudio?: () => void;
}

const getAuthToken = () => {
  return localStorage.getItem('vylant_token') || sessionStorage.getItem('vylant_token') || localStorage.getItem('token') || '';
};

export const ServerBotsTab: React.FC<ServerBotsTabProps> = ({
  server,
  currentUser,
  onRefreshServer,
  onOpenBotStudio
}) => {
  const [installedBots, setInstalledBots] = useState<BotData[]>([]);
  const [availableBots, setAvailableBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBotToView, setSelectedBotToView] = useState<BotData | null>(null);
  
  // Quick test dispatcher
  const [testBot, setTestBot] = useState<BotData | null>(null);
  const [testChannelId, setTestChannelId] = useState<string>('');
  const [testMessageText, setTestMessageText] = useState<string>('');
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Copied state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (server?.id) {
      loadServerBots();
      if (server.channels && server.channels.length > 0) {
        setTestChannelId(server.channels[0].id);
      }
    }
  }, [server?.id]);

  const loadServerBots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/servers/${server.id}/bots`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setInstalledBots(data.bots || []);
      }

      // Also load all user bots + public bots to know what can be invited
      const allRes = await fetch('/api/bots', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      if (allRes.ok) {
        const allData = await allRes.json();
        const all = [...(allData.myBots || []), ...(allData.publicBots || [])];
        // Unique bots not already installed
        const unique = all.filter((b, idx, self) => 
          self.findIndex(s => s.id === b.id) === idx && !b.installedServers?.includes(server.id)
        );
        setAvailableBots(unique);
      }
    } catch (e) {
      console.error('Failed to load server bots:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallBot = async (botId: string) => {
    try {
      const res = await fetch(`/api/servers/${server.id}/bots/${botId}/install`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      if (res.ok) {
        await loadServerBots();
        setShowAddModal(false);
        if (onRefreshServer) onRefreshServer();
      }
    } catch (e) {
      console.error('Failed to install bot to server:', e);
    }
  };

  const handleRemoveBot = async (botId: string) => {
    if (!confirm('Are you sure you want to remove this bot from this server?')) return;
    try {
      const res = await fetch(`/api/servers/${server.id}/bots/${botId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      if (res.ok) {
        await loadServerBots();
        if (onRefreshServer) onRefreshServer();
      }
    } catch (e) {
      console.error('Failed to remove bot from server:', e);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testBot || !testChannelId || !testMessageText.trim()) return;
    setTestSending(true);
    try {
      const res = await fetch('/api/bot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${testBot.token}`
        },
        body: JSON.stringify({
          serverId: server.id,
          channelId: testChannelId,
          text: testMessageText.trim()
        })
      });
      if (res.ok) {
        setTestSuccess(true);
        setTestMessageText('');
        setTimeout(() => setTestSuccess(false), 2000);
      }
    } catch (e) {
      console.error('Failed to send bot test message:', e);
    } finally {
      setTestSending(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 text-white animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#3f4147]">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            Server Bots & Integrations
          </h3>
          <p className="text-xs text-[#949ba4] mt-0.5">
            Manage automated bots, custom commands, and AI assistants active in <span className="text-white font-semibold">{server.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenBotStudio && (
            <button
              type="button"
              onClick={onOpenBotStudio}
              className="px-3.5 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-500/30 transition-colors flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Bot Developer Studio
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Bot to Server
          </button>
        </div>
      </div>

      {/* Installed Bots List */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
          Active Bots in Server ({installedBots.length})
        </h4>

        {installedBots.length === 0 ? (
          <div className="p-8 bg-[#1e1f22] border border-[#383a40] rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No Bots Added Yet</p>
              <p className="text-xs text-[#949ba4] mt-1">
                Add an AI assistant or custom bot to moderate chat, roll dice, and answer commands.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Browse Bots to Add
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {installedBots.map(bot => (
              <div
                key={bot.id}
                className="bg-[#1e1f22] border border-[#383a40] hover:border-[#4e5058] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={bot.avatar || 'https://i.imgur.com/pBnhSqE.png'}
                    alt={bot.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#383a40]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{bot.name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#5865f2] text-white rounded">
                        {bot.tag || 'BOT'}
                      </span>
                      {bot.isAiPowered && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#949ba4] mt-0.5">
                      Prefix: <code className="text-indigo-400 font-mono bg-[#2b2d31] px-1.5 py-0.2 rounded">{bot.prefix}</code>
                      <span className="mx-2">•</span>
                      {bot.commands?.length || 0} Commands
                      <span className="mx-2">•</span>
                      Created by @{bot.ownerName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedBotToView(bot)}
                    className="px-3 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    Commands ({bot.commands?.length || 0})
                  </button>
                  <button
                    onClick={() => setTestBot(bot)}
                    className="px-3 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    Quick Dispatch
                  </button>
                  <button
                    onClick={() => handleRemoveBot(bot.id)}
                    className="p-2 text-[#949ba4] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Remove from Server"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Dispatcher Box */}
      {testBot && (
        <div className="bg-[#1e1f22] border border-[#383a40] rounded-2xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">
                Dispatch Message as {testBot.name}
              </h4>
            </div>
            <button
              onClick={() => setTestBot(null)}
              className="text-xs text-[#949ba4] hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#b5bac1] uppercase">Target Channel:</label>
              <select
                value={testChannelId}
                onChange={e => setTestChannelId(e.target.value)}
                className="w-full px-3 py-2 bg-[#2b2d31] border border-[#383a40] rounded-lg text-white text-xs outline-none"
              >
                {server.channels?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-[#b5bac1] uppercase">Message Text:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMessageText}
                  onChange={e => setTestMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendTestMessage()}
                  placeholder={`Send a live broadcast into #${server.channels?.find((c: any) => c.id === testChannelId)?.name || 'general'}...`}
                  className="flex-1 px-3 py-2 bg-[#2b2d31] border border-[#383a40] rounded-lg text-white text-xs outline-none"
                />
                <button
                  onClick={handleSendTestMessage}
                  disabled={testSending || !testMessageText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {testSuccess ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  {testSuccess ? 'Sent!' : 'Dispatch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Developer Information Card */}
      <div className="bg-[#1e1f22] p-5 rounded-2xl border border-[#383a40] space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          Server Developer Identifiers
        </h4>
        <p className="text-xs text-[#949ba4]">
          Use these IDs in your external scripts and bots to target this specific server
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-[#141517] rounded-xl border border-[#2b2d31] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#949ba4] uppercase font-semibold block">Server ID</span>
              <code className="text-xs font-mono text-indigo-300">{server.id}</code>
            </div>
            <button
              onClick={() => handleCopy(server.id, 'sid')}
              className="p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded-lg text-xs flex items-center gap-1"
            >
              {copiedField === 'sid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-3 bg-[#141517] rounded-xl border border-[#2b2d31] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#949ba4] uppercase font-semibold block">Default Channel ID</span>
              <code className="text-xs font-mono text-indigo-300">{server.channels?.[0]?.id || 'c1'}</code>
            </div>
            <button
              onClick={() => handleCopy(server.channels?.[0]?.id || 'c1', 'cid')}
              className="p-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded-lg text-xs flex items-center gap-1"
            >
              {copiedField === 'cid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Add Bot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#2b2d31] border border-[#383a40] text-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Add a Bot to {server.name}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#949ba4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
              {availableBots.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#949ba4]">
                  No additional bots available. Open the Bot Studio to create one!
                </div>
              ) : (
                availableBots.map(bot => (
                  <div
                    key={bot.id}
                    className="p-3 bg-[#1e1f22] border border-[#383a40] rounded-xl flex items-center justify-between hover:border-[#4e5058] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={bot.avatar || 'https://i.imgur.com/pBnhSqE.png'}
                        alt={bot.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-[#383a40]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{bot.name}</span>
                          <span className="px-1 py-0.2 text-[9px] font-bold bg-[#5865f2] text-white rounded">
                            {bot.tag || 'BOT'}
                          </span>
                          {bot.isAiPowered && (
                            <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> AI
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#949ba4] line-clamp-1">
                          {bot.about || `Prefix: ${bot.prefix}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInstallBot(bot.id)}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#383a40] flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-[#35373c] hover:bg-[#3f4147] text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: View Bot Commands */}
      {selectedBotToView && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#2b2d31] border border-[#383a40] text-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={selectedBotToView.avatar || 'https://i.imgur.com/pBnhSqE.png'}
                  alt={selectedBotToView.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <h3 className="text-sm font-bold text-white">
                  {selectedBotToView.name} Commands
                </h3>
              </div>
              <button
                onClick={() => setSelectedBotToView(null)}
                className="text-[#949ba4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {selectedBotToView.commands?.map((cmd, idx) => (
                <div key={idx} className="p-3 bg-[#1e1f22] rounded-xl border border-[#383a40] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-400 font-bold">
                      {selectedBotToView.prefix}{cmd.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#949ba4] font-sans">{cmd.description}</p>
                </div>
              ))}
              {selectedBotToView.isAiPowered && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> @{selectedBotToView.name} &lt;query&gt;
                  </span>
                  <p className="text-[11px] text-[#949ba4] font-sans">
                    Ask Gemini AI anything directly in server channels!
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#383a40] flex justify-end">
              <button
                onClick={() => setSelectedBotToView(null)}
                className="px-4 py-2 bg-[#35373c] hover:bg-[#3f4147] text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
