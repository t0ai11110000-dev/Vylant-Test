import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Terminal,
  Code,
  Shield,
  ExternalLink,
  MessageSquare,
  Play,
  Send,
  Eye,
  EyeOff,
  Server,
  Key,
  Info,
  Layers,
  HelpCircle,
  Dices,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Globe,
  Settings,
  Cpu,
  BarChart3
} from 'lucide-react';
import { BotData, BotCommand, BotAutoResponse } from '../types/bot';
import { BotAnalyticsView } from './BotAnalyticsView';

interface BotStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  servers: any[];
  onBotInstalled?: () => void;
}

const PRESET_AVATARS = [
  'https://i.imgur.com/pBnhSqE.png',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1618172193763-c511deb635ca?auto=format&fit=crop&w=200&q=80'
];

const getAuthToken = () => {
  return localStorage.getItem('vylant_token') || sessionStorage.getItem('vylant_token') || localStorage.getItem('token') || '';
};

const formatApiError = (errData: any, fallback: string = 'An error occurred'): string => {
  if (!errData) return fallback;
  if (typeof errData === 'string') return errData;
  if (typeof errData.error === 'string') return errData.error;
  if (errData.error && typeof errData.error.message === 'string') return errData.error.message;
  if (typeof errData.message === 'string') return errData.message;
  return fallback;
};

export const BotStudioModal: React.FC<BotStudioModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  servers,
  onBotInstalled
}) => {
  const [activeTab, setActiveTab] = useState<'my-bots' | 'directory' | 'analytics' | 'editor' | 'sandbox' | 'docs'>('my-bots');
  const [selectedAnalyticsBotId, setSelectedAnalyticsBotId] = useState<string>('all');
  const [myBots, setMyBots] = useState<BotData[]>([]);
  const [publicBots, setPublicBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotData | null>(null);
  
  // Editor state
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('My Bot');
  const [formAvatar, setFormAvatar] = useState(PRESET_AVATARS[0]);
  const [formBanner, setFormBanner] = useState('');
  const [formAbout, setFormAbout] = useState('');
  const [formCustomStatus, setFormCustomStatus] = useState('');
  const [formPrefix, setFormPrefix] = useState('!');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formIsAiPowered, setFormIsAiPowered] = useState(true);
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formWelcomeMessage, setFormWelcomeMessage] = useState('');
  const [formCommands, setFormCommands] = useState<BotCommand[]>([]);
  const [formAutoResponses, setFormAutoResponses] = useState<BotAutoResponse[]>([]);
  const [currentToken, setCurrentToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Helper for authenticated requests with username fallback
  const getAuthHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    const username = currentUser?.name || currentUser?.username || localStorage.getItem('vylant_current_username') || 'T0AI User';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-username': username
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Add to Server Dialog
  const [installBotModal, setInstallBotModal] = useState<BotData | null>(null);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [installSuccess, setInstallSuccess] = useState(false);

  // Sandbox state
  const [sandboxBot, setSandboxBot] = useState<BotData | null>(null);
  const [sandboxMessages, setSandboxMessages] = useState<Array<{ sender: string; text: string; isBot?: boolean; timestamp: number }>>([]);
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // Docs state
  const [docsLanguage, setDocsLanguage] = useState<'curl' | 'javascript' | 'python'>('javascript');

  useEffect(() => {
    if (isOpen) {
      loadBots();
    }
  }, [isOpen]);

  const loadBots = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bots', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMyBots(data.myBots || []);
        setPublicBots(data.publicBots || []);
        if (data.myBots && data.myBots.length > 0 && !sandboxBot) {
          setSandboxBot(data.myBots[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load bots:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setEditId(null);
    setFormName('My Bot');
    setFormAvatar(PRESET_AVATARS[0]);
    setFormBanner('');
    setFormAbout('A helpful custom bot for Vylant servers.');
    setFormCustomStatus('Assisting server members ✨');
    setFormPrefix('!');
    setFormIsPublic(false);
    setFormIsAiPowered(true);
    setFormSystemPrompt(`You are a friendly, witty, and helpful assistant bot on Vylant.`);
    setFormWelcomeMessage('🎉 Welcome {user} to {server}! Glad you joined.');
    setFormCommands([
      { id: 'cmd_1', name: 'ping', description: 'Ping the bot for latency test', response: '🏓 **Pong!** Bot is online and ready ⚡' },
      { id: 'cmd_2', name: 'help', description: 'List all commands', response: '🤖 **Available Commands**:\n• `{prefix}ping` - Latency check\n• `{prefix}roll` - Roll dice (`{prefix}roll 2d6`)\n• `{prefix}coinflip` - Flip a coin\n• `{prefix}about` - Bot info' },
      { id: 'cmd_3', name: 'roll', description: 'Roll dice', response: '🎲 {user} rolled: **{dice:2d6}**' },
      { id: 'cmd_4', name: 'coinflip', description: 'Heads or Tails', response: '🪙 Result: **{random:Heads,Tails}**!' },
      { id: 'cmd_5', name: 'about', description: 'Information about this bot', response: '✨ Developed with Vylant Bot Studio by @{sender}!' }
    ]);
    setFormAutoResponses([
      { id: 'ar_1', trigger: 'gm', matchType: 'exact', response: '🌅 Good morning {user}! Have an amazing day ahead!' }
    ]);
    setCurrentToken('');
    setShowToken(false);
    setSaveError('');
    setActiveTab('editor');
  };

  const handleStartEdit = (bot: BotData) => {
    setEditId(bot.id);
    setFormName(bot.name);
    setFormAvatar(bot.avatar || PRESET_AVATARS[0]);
    setFormBanner(bot.banner || '');
    setFormAbout(bot.about || '');
    setFormCustomStatus(bot.customStatus || '');
    setFormPrefix(bot.prefix || '!');
    setFormIsPublic(bot.isPublic || false);
    setFormIsAiPowered(bot.isAiPowered !== false);
    setFormSystemPrompt(bot.systemPrompt || '');
    setFormWelcomeMessage(bot.welcomeMessage || '');
    setFormCommands(bot.commands || []);
    setFormAutoResponses(bot.autoResponses || []);
    setCurrentToken(bot.token || '');
    setShowToken(false);
    setSaveError('');
    setActiveTab('editor');
  };

  const handleSaveBot = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setSaveError('Bot Display Name is required');
      return;
    }
    setSaveError('');
    setLoading(true);

    try {
      const payload = {
        name: trimmedName,
        avatar: formAvatar,
        banner: formBanner,
        about: formAbout,
        customStatus: formCustomStatus,
        prefix: formPrefix || '!',
        isPublic: formIsPublic,
        isAiPowered: formIsAiPowered,
        systemPrompt: formSystemPrompt,
        welcomeMessage: formWelcomeMessage,
        commands: formCommands,
        autoResponses: formAutoResponses,
        ownerName: currentUser?.name || currentUser?.username || 'User'
      };

      let res;
      if (editId) {
        res = await fetch(`/api/bots/${editId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/bots', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(true);
        setSaveError('');
        await loadBots();
        if (data.bot) {
          setEditId(data.bot.id);
          setCurrentToken(data.bot.token);
          setSandboxBot(data.bot);
        }
        // Auto-navigate to My Bots after brief confirmation so user sees their new bot
        setTimeout(() => {
          setSaveSuccess(false);
          setActiveTab('my-bots');
        }, 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(formatApiError(err, 'Failed to save bot'));
      }
    } catch (e: any) {
      setSaveError(formatApiError(e, 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateToken = async (botId: string) => {
    if (!confirm('Are you sure you want to regenerate this bot token? Existing apps using this token will stop working.')) {
      return;
    }
    try {
      const res = await fetch(`/api/bots/${botId}/regenerate-token`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentToken(data.token);
        await loadBots();
      }
    } catch (e) {
      console.error('Failed to regenerate token:', e);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot? This cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await loadBots();
        if (editId === botId) {
          setActiveTab('my-bots');
        }
      }
    } catch (e) {
      console.error('Failed to delete bot:', e);
    }
  };

  const handleInstallBot = async () => {
    if (!installBotModal || !selectedServerId) return;
    try {
      const res = await fetch(`/api/servers/${selectedServerId}/bots/${installBotModal.id}/install`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setInstallSuccess(true);
        setTimeout(() => {
          setInstallSuccess(false);
          setInstallBotModal(null);
          setSelectedServerId('');
        }, 1500);
        await loadBots();
        if (onBotInstalled) onBotInstalled();
      }
    } catch (e) {
      console.error('Failed to install bot:', e);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleAddCommand = () => {
    const newCmd: BotCommand = {
      id: `cmd_${Date.now()}`,
      name: `command${formCommands.length + 1}`,
      description: 'Custom command description',
      response: 'Hello from your bot command!'
    };
    setFormCommands([...formCommands, newCmd]);
  };

  const handleUpdateCommand = (index: number, field: keyof BotCommand, value: string) => {
    const updated = [...formCommands];
    updated[index] = { ...updated[index], [field]: value };
    setFormCommands(updated);
  };

  const handleDeleteCommand = (index: number) => {
    setFormCommands(formCommands.filter((_, i) => i !== index));
  };

  const handleAddAutoResponse = () => {
    const newAr: BotAutoResponse = {
      id: `ar_${Date.now()}`,
      trigger: 'hello',
      matchType: 'contains',
      response: '👋 Hello there {user}!'
    };
    setFormAutoResponses([...formAutoResponses, newAr]);
  };

  const handleUpdateAutoResponse = (index: number, field: keyof BotAutoResponse, value: string) => {
    const updated = [...formAutoResponses];
    updated[index] = { ...updated[index], [field]: value };
    setFormAutoResponses(updated);
  };

  const handleDeleteAutoResponse = (index: number) => {
    setFormAutoResponses(formAutoResponses.filter((_, i) => i !== index));
  };

  // Sandbox testing
  const handleSendSandboxMessage = async () => {
    if (!sandboxInput.trim() || !sandboxBot) return;
    const userMsg = sandboxInput.trim();
    setSandboxInput('');

    const newMsgs = [...sandboxMessages, { sender: currentUser?.name || 'You', text: userMsg, timestamp: Date.now() }];
    setSandboxMessages(newMsgs);
    setSandboxLoading(true);

    try {
      const res = await fetch('/api/bot/test-command', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          botId: sandboxBot.id,
          messageText: userMsg,
          senderName: currentUser?.name || 'You'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSandboxMessages(prev => [
          ...prev,
          {
            sender: sandboxBot.name,
            text: data.response || 'No response',
            isBot: true,
            timestamp: Date.now()
          }
        ]);
      }
    } catch (e) {
      setSandboxMessages(prev => [
        ...prev,
        {
          sender: sandboxBot.name,
          text: '⚠️ Error executing test in sandbox.',
          isBot: true,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setSandboxLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#2b2d31] text-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#3f4147]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#1e1f22] border-b border-[#313338] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Vylant Bot Studio
              </h2>
              <p className="text-xs text-[#949ba4]">
                Create, customize, and program intelligent bots for your servers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Bot
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 bg-[#232428] border-b border-[#313338] flex gap-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('my-bots')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'my-bots'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-[#949ba4] hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            My Bots ({myBots.length})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'directory'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-[#949ba4] hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            Bot Directory ({publicBots.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-[#949ba4] hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          {activeTab === 'editor' && (
            <button
              onClick={() => setActiveTab('editor')}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 border-indigo-500 text-white"
            >
              <Edit3 className="w-4 h-4" />
              {editId ? 'Edit Bot' : 'Create Bot'}
            </button>
          )}
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'sandbox'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-[#949ba4] hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Interactive Sandbox
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'docs'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-[#949ba4] hover:text-white'
            }`}
          >
            <Code className="w-4 h-4" />
            Developer API
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#2b2d31]">
          {/* TAB 1: MY BOTS */}
          {activeTab === 'my-bots' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Your Applications & Bots</h3>
                  <p className="text-sm text-[#949ba4]">
                    Manage your custom bots, edit commands, and deploy them to servers
                  </p>
                </div>
                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Application
                </button>
              </div>

              {myBots.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-[#3f4147] rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Bot className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-white">No Bots Created Yet</h4>
                    <p className="text-sm text-[#949ba4] max-w-md mt-1">
                      Start by creating your first bot. You can customize its name, avatar, commands, auto-responses, and even power it with Gemini AI!
                    </p>
                  </div>
                  <button
                    onClick={handleStartCreate}
                    className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl shadow-md transition-colors"
                  >
                    Build Your First Bot
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myBots.map(bot => (
                    <div
                      key={bot.id}
                      className="bg-[#1e1f22] border border-[#383a40] rounded-xl p-5 flex flex-col justify-between hover:border-[#4e5058] transition-all group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={bot.avatar || PRESET_AVATARS[0]}
                              alt={bot.name}
                              className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#383a40]"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-base">{bot.name}</h4>
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#5865f2] text-white rounded">
                                  {bot.tag || 'BOT'}
                                </span>
                              </div>
                              <p className="text-xs text-[#949ba4] flex items-center gap-1 mt-0.5">
                                Prefix: <code className="px-1.5 py-0.2 bg-[#2b2d31] rounded text-indigo-400 font-mono">{bot.prefix}</code>
                                {bot.isAiPowered && (
                                  <span className="flex items-center gap-1 text-emerald-400 ml-2">
                                    <Sparkles className="w-3 h-3" /> AI
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(bot)}
                              className="p-2 text-[#949ba4] hover:text-white hover:bg-[#2b2d31] rounded-lg transition-colors"
                              title="Edit Bot"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {bot.ownerId !== 'system' && (
                              <button
                                onClick={() => handleDeleteBot(bot.id)}
                                className="p-2 text-[#949ba4] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete Bot"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-[#dbdee1] line-clamp-2">
                          {bot.about || 'No description provided.'}
                        </p>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2.5 py-1 bg-[#2b2d31] text-[#949ba4] rounded-md flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5 text-indigo-400" />
                            {bot.installedServers?.length || 0} Servers
                          </span>
                          <span className="px-2.5 py-1 bg-[#2b2d31] text-[#949ba4] rounded-md flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-amber-400" />
                            {bot.commands?.length || 0} Commands
                          </span>
                          <span className="px-2.5 py-1 bg-[#2b2d31] text-[#949ba4] rounded-md flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            {bot.stats?.messagesSent || 0} Dispatched
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#313338] flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setInstallBotModal(bot);
                            setSelectedServerId(servers[0]?.id || '');
                          }}
                          className="flex-1 py-1.5 px-3 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add to Server
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAnalyticsBotId(bot.id);
                            setActiveTab('analytics');
                          }}
                          className="py-1.5 px-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          title="View Bot Analytics"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                          Analytics
                        </button>
                        <button
                          onClick={() => {
                            setSandboxBot(bot);
                            setActiveTab('sandbox');
                          }}
                          className="py-1.5 px-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                          Sandbox
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BOT DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Public Bot Directory</h3>
                <p className="text-sm text-[#949ba4]">
                  Discover community-created bots and invite them directly to your servers
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicBots.map(bot => (
                  <div
                    key={bot.id}
                    className="bg-[#1e1f22] border border-[#383a40] rounded-xl p-5 flex flex-col justify-between hover:border-[#4e5058] transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={bot.avatar || PRESET_AVATARS[0]}
                          alt={bot.name}
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#383a40]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base">{bot.name}</h4>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#5865f2] text-white rounded">
                              {bot.tag || 'BOT'}
                            </span>
                          </div>
                          <p className="text-xs text-[#949ba4]">
                            Created by <span className="text-indigo-400 font-medium">@{bot.ownerName}</span>
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#dbdee1] line-clamp-2">
                        {bot.about || 'A public Vylant bot.'}
                      </p>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-[#2b2d31] text-[#949ba4] rounded">
                          Prefix: <code className="text-indigo-400">{bot.prefix}</code>
                        </span>
                        {bot.isAiPowered && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Gemini AI
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-[#2b2d31] text-[#949ba4] rounded">
                          {bot.commands?.length || 0} Commands
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#313338] flex items-center justify-between">
                      <span className="text-xs text-[#949ba4]">
                        In {bot.installedServers?.length || 0} servers
                      </span>
                      <button
                        onClick={() => {
                          setInstallBotModal(bot);
                          setSelectedServerId(servers[0]?.id || '');
                        }}
                        className="py-1.5 px-3 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Invite to Server
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ANALYTICS */}
          {activeTab === 'analytics' && (
            <BotAnalyticsView
              myBots={myBots}
              selectedBotId={selectedAnalyticsBotId}
              onSelectBotId={setSelectedAnalyticsBotId}
              onOpenSandbox={(bot) => {
                setSandboxBot(bot);
                setActiveTab('sandbox');
              }}
              onCreateBot={handleStartCreate}
              onRefreshBots={loadBots}
              servers={servers}
            />
          )}

          {/* TAB 3: BOT EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              {saveSuccess && (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-3 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-sm font-medium">Bot changes successfully saved!</p>
                </div>
              )}

              {saveError && (
                <div className="p-4 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl flex items-center gap-3 animate-fade-in">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <p className="text-sm font-medium">{saveError}</p>
                </div>
              )}

              {/* Section 1: Identity & Credentials */}
              <div className="bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40] space-y-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-400" />
                  Application Identity
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider flex items-center justify-between">
                      <span>Bot Display Name *</span>
                      {formName.trim() === '' && (
                        <span className="text-[11px] text-rose-400 font-normal">Required</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => {
                        setFormName(e.target.value);
                        if (saveError) setSaveError('');
                      }}
                      placeholder="e.g. EchoBot, QuestMaster, ModGuard"
                      className="w-full px-3.5 py-2.5 bg-[#2b2d31] border border-[#383a40] focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition-colors"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-[#949ba4]">Suggestions:</span>
                      {['EchoBot', 'ModGuard', 'GameBot', 'T0-Helper', 'MusicBot'].map(sugg => (
                        <button
                          key={sugg}
                          type="button"
                          onClick={() => {
                            setFormName(sugg);
                            if (saveError) setSaveError('');
                          }}
                          className="px-2 py-0.5 bg-[#2b2d31] hover:bg-[#35373c] border border-[#383a40] hover:border-indigo-500/50 text-[11px] text-[#dbdee1] rounded-md transition-colors"
                        >
                          {sugg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                      Command Prefix *
                    </label>
                    <input
                      type="text"
                      value={formPrefix}
                      onChange={e => setFormPrefix(e.target.value)}
                      placeholder="!"
                      maxLength={5}
                      className="w-full px-3.5 py-2.5 bg-[#2b2d31] border border-[#383a40] focus:border-indigo-500 rounded-xl text-white text-sm font-mono outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                    Avatar & Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={formAvatar || PRESET_AVATARS[0]}
                      alt="Preview"
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500 shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={formAvatar}
                        onChange={e => setFormAvatar(e.target.value)}
                        placeholder="Image URL (https://...)"
                        className="w-full px-3.5 py-2 bg-[#2b2d31] border border-[#383a40] focus:border-indigo-500 rounded-lg text-white text-xs outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#949ba4]">Preset Avatars:</span>
                        {PRESET_AVATARS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormAvatar(p)}
                            className={`w-6 h-6 rounded-md overflow-hidden ring-1 transition-all ${
                              formAvatar === p ? 'ring-indigo-500 scale-110' : 'ring-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={p} alt="Preset" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                    Custom Status / Activity
                  </label>
                  <input
                    type="text"
                    value={formCustomStatus}
                    onChange={e => setFormCustomStatus(e.target.value)}
                    placeholder="e.g. Guarding the realm | Type !help"
                    className="w-full px-3.5 py-2.5 bg-[#2b2d31] border border-[#383a40] focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                    About / Bio
                  </label>
                  <textarea
                    value={formAbout}
                    onChange={e => setFormAbout(e.target.value)}
                    rows={2}
                    placeholder="Describe what your bot does..."
                    className="w-full px-3.5 py-2.5 bg-[#2b2d31] border border-[#383a40] focus:border-indigo-500 rounded-xl text-white text-sm outline-none resize-none"
                  />
                </div>

                {/* Developer Token Section */}
                {editId && (
                  <div className="pt-4 border-t border-[#313338] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        Developer Bot Token
                      </label>
                      <span className="text-[11px] text-amber-400 font-medium">Keep this secret!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          readOnly
                          value={currentToken || 'vyl_bot_secret_token_123456789'}
                          className="w-full px-3.5 py-2.5 bg-[#141517] border border-[#383a40] rounded-xl text-white font-mono text-xs outline-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-2.5 text-[#949ba4] hover:text-white"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentToken)}
                        className="px-3 py-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedToken ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateToken(editId)}
                        className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-500/20"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: AI Capabilities */}
              <div className="bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Gemini AI Intelligence</h3>
                      <p className="text-xs text-[#949ba4]">
                        Enable your bot to converse naturally when mentioned (@{formName || 'Bot'}) or via {formPrefix}ai
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsAiPowered}
                      onChange={e => setFormIsAiPowered(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#35373c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {formIsAiPowered && (
                  <div className="space-y-2 pt-3 border-t border-[#313338] animate-fade-in">
                    <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                      Custom System Instructions & Personality
                    </label>
                    <textarea
                      value={formSystemPrompt}
                      onChange={e => setFormSystemPrompt(e.target.value)}
                      rows={3}
                      placeholder="Define your bot's personality, tone, and specific knowledge..."
                      className="w-full px-3.5 py-2.5 bg-[#2b2d31] border border-[#383a40] focus:border-indigo-500 rounded-xl text-white text-sm outline-none resize-none font-sans"
                    />
                    <p className="text-[11px] text-[#949ba4]">
                      Example: "You are an ancient wizard assistant who speaks in poetic riddles and helps adventurers."
                    </p>
                  </div>
                )}
              </div>

              {/* Section 3: Commands Manager */}
              <div className="bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40] space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-indigo-400" />
                      Custom Commands ({formCommands.length})
                    </h3>
                    <p className="text-xs text-[#949ba4]">
                      Responses support dynamic placeholders like <code className="text-indigo-400">{'{user}'}</code>, <code className="text-indigo-400">{'{dice:2d6}'}</code>, and <code className="text-indigo-400">{'{random:1-100}'}</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCommand}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Command
                  </button>
                </div>

                <div className="space-y-3">
                  {formCommands.map((cmd, index) => (
                    <div
                      key={cmd.id || index}
                      className="p-4 bg-[#2b2d31] border border-[#383a40] rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-mono text-indigo-400 font-bold text-sm">
                            {formPrefix || '!'}
                          </span>
                          <input
                            type="text"
                            value={cmd.name}
                            onChange={e => handleUpdateCommand(index, 'name', e.target.value)}
                            placeholder="command-name"
                            className="flex-1 px-3 py-1.5 bg-[#1e1f22] border border-[#383a40] focus:border-indigo-500 rounded-lg text-white font-mono text-xs outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          value={cmd.description}
                          onChange={e => handleUpdateCommand(index, 'description', e.target.value)}
                          placeholder="Brief description"
                          className="flex-1 px-3 py-1.5 bg-[#1e1f22] border border-[#383a40] focus:border-indigo-500 rounded-lg text-white text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteCommand(index)}
                          className="p-1.5 text-[#949ba4] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <textarea
                          value={cmd.response}
                          onChange={e => handleUpdateCommand(index, 'response', e.target.value)}
                          rows={2}
                          placeholder="Bot response message... supports markdown formatting"
                          className="w-full px-3 py-2 bg-[#1e1f22] border border-[#383a40] focus:border-indigo-500 rounded-lg text-white text-xs outline-none resize-none font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cheatsheet for variables */}
                <div className="p-3 bg-[#141517] rounded-xl border border-[#2b2d31] text-xs text-[#949ba4] space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    Placeholders & Variables Cheat Sheet:
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    <div><code className="text-indigo-300">{'{user}'}</code> - Mentioning User</div>
                    <div><code className="text-indigo-300">{'{server}'}</code> - Server Name</div>
                    <div><code className="text-indigo-300">{'{dice:2d6}'}</code> - Dice Roller</div>
                    <div><code className="text-indigo-300">{'{random:1-100}'}</code> - Random Range</div>
                    <div><code className="text-indigo-300">{'{random:A,B,C}'}</code> - Random Choice</div>
                    <div><code className="text-indigo-300">{'{time}'}</code> - Current Time</div>
                    <div><code className="text-indigo-300">{'{date}'}</code> - Current Date</div>
                    <div><code className="text-indigo-300">{'{args}'}</code> - Extra Arguments</div>
                  </div>
                </div>
              </div>

              {/* Section 4: Auto-Responses */}
              <div className="bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40] space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-400" />
                      Auto-Responses ({formAutoResponses.length})
                    </h3>
                    <p className="text-xs text-[#949ba4]">
                      Automatically replies when users type specific words or triggers in chat
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAutoResponse}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Trigger
                  </button>
                </div>

                <div className="space-y-3">
                  {formAutoResponses.map((ar, index) => (
                    <div
                      key={ar.id || index}
                      className="p-4 bg-[#2b2d31] border border-[#383a40] rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={ar.trigger}
                          onChange={e => handleUpdateAutoResponse(index, 'trigger', e.target.value)}
                          placeholder="Trigger phrase (e.g. hello, gg)"
                          className="flex-1 px-3 py-1.5 bg-[#1e1f22] border border-[#383a40] focus:border-indigo-500 rounded-lg text-white text-xs outline-none font-mono"
                        />
                        <select
                          value={ar.matchType}
                          onChange={e => handleUpdateAutoResponse(index, 'matchType', e.target.value as any)}
                          className="px-3 py-1.5 bg-[#1e1f22] border border-[#383a40] rounded-lg text-white text-xs outline-none"
                        >
                          <option value="contains">Contains trigger</option>
                          <option value="exact">Exact match</option>
                          <option value="startsWith">Starts with trigger</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteAutoResponse(index)}
                          className="p-1.5 text-[#949ba4] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={ar.response}
                        onChange={e => handleUpdateAutoResponse(index, 'response', e.target.value)}
                        rows={1}
                        placeholder="Response to send..."
                        className="w-full px-3 py-2 bg-[#1e1f22] border border-[#383a40] focus:border-indigo-500 rounded-lg text-white text-xs outline-none resize-none font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Welcome Greeting & Discovery */}
              <div className="bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40] space-y-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  Welcome Message & Discovery
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#b5bac1] uppercase tracking-wider">
                    Server Join Welcome Greeting
                  </label>
                  <input
                    type="text"
                    value={formWelcomeMessage}
                    onChange={e => setFormWelcomeMessage(e.target.value)}
                    placeholder="🎉 Welcome {user} to {server}! Type !help to get started."
                    className="w-full px-3.5 py-2.5 bg-[#2b2d31] border border-[#383a40] focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
                  />
                  <p className="text-[11px] text-[#949ba4]">
                    Automatically posted to the server's default text channel when the bot is installed.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#313338] flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-white block">List in Public Bot Directory</span>
                    <span className="text-xs text-[#949ba4]">Allow other server owners to discover and invite your bot</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPublic}
                      onChange={e => setFormIsPublic(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#35373c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#383a40]/60">
                <div className="flex-1 w-full">
                  {saveError && (
                    <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  )}
                  {saveSuccess && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Bot application saved successfully!</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('my-bots')}
                    className="px-5 py-2.5 bg-[#35373c] hover:bg-[#3f4147] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSaveBot}
                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg transition-colors flex items-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editId ? 'Save Changes' : 'Create Bot Application'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INTERACTIVE SANDBOX */}
          {activeTab === 'sandbox' && (
            <div className="h-full flex flex-col space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between bg-[#1e1f22] p-4 rounded-xl border border-[#383a40]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Testing Environment</h4>
                    <p className="text-xs text-[#949ba4]">Simulate commands and AI triggers in real time</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#949ba4]">Active Bot:</span>
                  <select
                    value={sandboxBot?.id || ''}
                    onChange={e => {
                      const found = [...myBots, ...publicBots].find(b => b.id === e.target.value);
                      if (found) setSandboxBot(found);
                    }}
                    className="px-3 py-1.5 bg-[#2b2d31] border border-[#383a40] rounded-lg text-white text-xs font-medium outline-none"
                  >
                    {[...myBots, ...publicBots].map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.prefix})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chat Simulation Area */}
              <div className="flex-1 min-h-[350px] bg-[#1e1f22] border border-[#383a40] rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {sandboxMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#949ba4]">
                      <Terminal className="w-10 h-10 text-[#4e5058] mb-2" />
                      <p className="text-sm font-semibold text-white">Sandbox Console Ready</p>
                      <p className="text-xs mt-1 max-w-sm">
                        Type a command (e.g. <code className="text-indigo-400">{sandboxBot?.prefix || '!'}help</code> or <code className="text-indigo-400">{sandboxBot?.prefix || '!'}ping</code>) or mention the bot to test responses.
                      </p>
                    </div>
                  ) : (
                    sandboxMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 ${
                          msg.isBot ? 'bg-[#2b2d31]/60' : 'bg-[#2b2d31]/20'
                        } p-3 rounded-xl`}
                      >
                        <img
                          src={
                            msg.isBot
                              ? sandboxBot?.avatar || PRESET_AVATARS[0]
                              : currentUser?.image || 'https://i.imgur.com/pBnhSqE.png'
                          }
                          alt={msg.sender}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{msg.sender}</span>
                            {msg.isBot && (
                              <span className="px-1.5 py-0.2 bg-[#5865f2] text-[10px] font-bold text-white rounded">
                                BOT
                              </span>
                            )}
                            <span className="text-[10px] text-[#949ba4]">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-xs text-[#dbdee1] mt-1 whitespace-pre-wrap font-sans">
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {sandboxLoading && (
                    <div className="flex items-center gap-2 text-xs text-indigo-400 p-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{sandboxBot?.name || 'Bot'} is processing...</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#313338] flex items-center gap-2">
                  <input
                    type="text"
                    value={sandboxInput}
                    onChange={e => setSandboxInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendSandboxMessage()}
                    placeholder={`Type a command (e.g. ${sandboxBot?.prefix || '!'}ping, ${sandboxBot?.prefix || '!'}roll, or ask a question)...`}
                    className="flex-1 px-4 py-2.5 bg-[#2b2d31] border border-[#383a40] focus:border-indigo-500 rounded-xl text-white text-xs outline-none"
                  />
                  <button
                    onClick={handleSendSandboxMessage}
                    className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DEVELOPER API & DOCS */}
          {activeTab === 'docs' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-[#1e1f22] p-6 rounded-2xl border border-[#383a40] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Code className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">External Bot REST API</h3>
                    <p className="text-xs text-[#949ba4]">
                      Control and send messages as your bot programmatically using external scripts, webhooks, or cron jobs
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#141517] rounded-xl border border-[#2b2d31] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#b5bac1]">Endpoint:</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold rounded">
                      POST /api/bot/message
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#b5bac1]">Authentication:</span>
                    <span className="text-xs font-mono text-indigo-400">
                      Header: <code className="bg-[#2b2d31] px-1.5 py-0.5 rounded">Authorization: Bot &lt;BOT_TOKEN&gt;</code>
                    </span>
                  </div>
                </div>

                {/* Code switcher */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Code Example</span>
                    <div className="flex bg-[#2b2d31] p-0.5 rounded-lg">
                      {(['javascript', 'python', 'curl'] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => setDocsLanguage(lang)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all uppercase ${
                            docsLanguage === lang
                              ? 'bg-indigo-500 text-white shadow-sm'
                              : 'text-[#949ba4] hover:text-white'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="p-4 bg-[#141517] rounded-xl border border-[#2b2d31] text-xs font-mono text-indigo-300 overflow-x-auto">
                      {docsLanguage === 'javascript' &&
`// Send message as Bot using Node.js / Fetch
const BOT_TOKEN = "${myBots[0]?.token || 'vyl_bot_YOUR_TOKEN_HERE'}";

async function sendBotMessage() {
  const response = await fetch("https://YOUR_VYLANT_URL/api/bot/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": \`Bot \${BOT_TOKEN}\`
    },
    body: JSON.stringify({
      serverId: "1",         // Target Server ID
      channelId: "c1",       // Target Channel ID
      text: "⚡ Automated server update alert from custom script!"
    })
  });

  const result = await response.json();
  console.log("Message sent:", result);
}

sendBotMessage();`}

                      {docsLanguage === 'python' &&
`# Send message as Bot using Python requests
import requests

BOT_TOKEN = "${myBots[0]?.token || 'vyl_bot_YOUR_TOKEN_HERE'}"
URL = "https://YOUR_VYLANT_URL/api/bot/message"

headers = {
    "Authorization": f"Bot {BOT_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "serverId": "1",
    "channelId": "c1",
    "text": "🐍 Python automated task completed successfully!"
}

response = requests.post(URL, json=payload, headers=headers)
print(response.json())`}

                      {docsLanguage === 'curl' &&
`# Send message as Bot using cURL
curl -X POST https://YOUR_VYLANT_URL/api/bot/message \\
  -H "Authorization: Bot ${myBots[0]?.token || 'vyl_bot_YOUR_TOKEN_HERE'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "serverId": "1",
    "channelId": "c1",
    "text": "🚀 Hello from terminal cURL dispatch!"
  }'`}
                    </pre>

                    <button
                      onClick={() => {
                        const code = docsLanguage === 'javascript'
                          ? `const BOT_TOKEN = "${myBots[0]?.token || 'vyl_bot_YOUR_TOKEN_HERE'}";`
                          : docsLanguage === 'python'
                          ? `BOT_TOKEN = "${myBots[0]?.token || 'vyl_bot_YOUR_TOKEN_HERE'}"`
                          : `curl -X POST https://YOUR_VYLANT_URL/api/bot/message`;
                        handleCopy(code);
                      }}
                      className="absolute top-3 right-3 p-1.5 bg-[#2b2d31] hover:bg-[#383a40] text-white rounded-lg text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add to Server Modal / Dialog */}
        <AnimatePresence>
          {installBotModal && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#2b2d31] border border-[#383a40] text-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5"
              >
                <div className="text-center space-y-2">
                  <img
                    src={installBotModal.avatar || PRESET_AVATARS[0]}
                    alt={installBotModal.name}
                    className="w-16 h-16 rounded-2xl mx-auto object-cover ring-4 ring-indigo-500/30"
                  />
                  <h3 className="text-lg font-bold text-white">
                    Add {installBotModal.name} to a Server
                  </h3>
                  <p className="text-xs text-[#949ba4]">
                    Select the server where you want to invite this bot application
                  </p>
                </div>

                {installSuccess ? (
                  <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-center font-semibold text-sm">
                    🎉 Bot successfully added to server!
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#b5bac1] uppercase">
                        Select Destination Server:
                      </label>
                      <select
                        value={selectedServerId}
                        onChange={e => setSelectedServerId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#1e1f22] border border-[#383a40] rounded-xl text-white text-sm outline-none"
                      >
                        {servers.map(server => (
                          <option key={server.id} value={server.id}>
                            {server.name} {installBotModal.installedServers?.includes(server.id) ? '(Installed)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-[#1e1f22] rounded-xl border border-[#383a40] text-xs space-y-1 text-[#949ba4]">
                      <div className="font-semibold text-white">Bot Permissions:</div>
                      <div>• Read messages and process commands ({installBotModal.prefix})</div>
                      <div>• Send messages & embeds in server channels</div>
                      {installBotModal.isAiPowered && <div>• Generate Gemini AI responses</div>}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => setInstallBotModal(null)}
                        className="px-4 py-2 bg-[#35373c] hover:bg-[#3f4147] text-white text-xs font-semibold rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleInstallBot}
                        disabled={!selectedServerId}
                        className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        Authorize & Add Bot
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
