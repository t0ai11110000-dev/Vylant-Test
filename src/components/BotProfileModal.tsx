import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
 Bot,
 Sparkles,
 Server,
 Terminal,
 Plus,
 Check,
 X,
 Copy,
 ExternalLink,
 ShieldCheck,
 Code
} from 'lucide-react';
import { BotData } from '../types/bot';

interface BotProfileModalProps {
 bot: BotData | any;
 isOpen: boolean;
 onClose: () => void;
 servers: any[];
 onOpenBotStudio?: () => void;
 onBotInstalled?: () => void;
}

const getAuthToken = () => {
 return localStorage.getItem('vylant_token') || sessionStorage.getItem('vylant_token') || localStorage.getItem('token') || '';
};

export const BotProfileModal: React.FC<BotProfileModalProps> = ({
 bot,
 isOpen,
 onClose,
 servers,
 onOpenBotStudio,
 onBotInstalled
}) => {
 const [selectedServerId, setSelectedServerId] = useState('');
 const [installing, setInstalling] = useState(false);
 const [installSuccess, setInstallSuccess] = useState(false);
 const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

 if (!isOpen || !bot) return null;

 const handleInstall = async () => {
 if (!selectedServerId) return;
 setInstalling(true);
 try {
  const res = await fetch(`/api/servers/${selectedServerId}/bots/${bot.id}/install`, {
  method: 'POST',
  headers: {
   'Authorization': `Bearer ${getAuthToken()}`
  }
  });
  if (res.ok) {
  setInstallSuccess(true);
  setTimeout(() => {
   setInstallSuccess(false);
   if (onBotInstalled) onBotInstalled();
  }, 1500);
  }
 } catch (e) {
  console.error('Failed to install bot:', e);
 } finally {
  setInstalling(false);
 }
 };

 const handleCopyCommand = (cmdStr: string) => {
 navigator.clipboard.writeText(cmdStr);
 setCopiedCmd(cmdStr);
 setTimeout(() => setCopiedCmd(null), 1500);
 };

 return (
 <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
  <motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  className="bg-[#2b2d31] border border-[#383a40] text-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
  >
  {/* Banner */}
  <div
   className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative bg-cover bg-center"
   style={bot.banner ? { backgroundImage: `url(${bot.banner})` } : {}}
  >
   <button
   onClick={onClose}
   className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
   >
   <X className="w-4 h-4" />
   </button>
  </div>

  {/* Profile Content */}
  <div className="px-6 pb-6 pt-0 relative space-y-4">
   {/* Avatar & Badges */}
   <div className="flex items-end justify-between -mt-10 mb-2">
   <div className="relative">
    <img
    src={bot.avatar || bot.image || 'https://i.imgur.com/pBnhSqE.png'}
    alt={bot.name}
    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#2b2d31] bg-vylant-navy"
    />
    <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#2b2d31] rounded-full"></span>
   </div>

   <div className="flex items-center gap-1.5 mb-1">
    <span className="px-2 py-0.5 text-xs font-bold bg-[#5865f2] text-white rounded flex items-center gap-1 shadow-sm">
    <Bot className="w-3 h-3" />
    {bot.botTag || bot.tag || 'BOT'}
    </span>
    {bot.isAiPowered && (
    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded flex items-center gap-1 shadow-sm">
     <Sparkles className="w-3 h-3" />
     AI
    </span>
    )}
   </div>
   </div>

   {/* Name & Developer Info */}
   <div>
   <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
    {bot.name}
   </h3>
   <p className="text-xs text-[#949ba4] flex items-center gap-1 mt-0.5">
    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
    Developed by <span className="text-white font-medium">@{bot.ownerName || 'Vylant System'}</span>
   </p>
   </div>

   {/* Bio / About */}
   <div className="p-3 bg-vylant-navy rounded-xl border border-[#383a40] space-y-1">
   <span className="text-[10px] text-[#b5bac1] font-semibold uppercase tracking-wider block">
    About Bot
   </span>
   <p className="text-xs text-[#dbdee1] leading-relaxed whitespace-pre-wrap">
    {bot.about || bot.customStatus || 'An interactive bot for Vylant communities.'}
   </p>
   </div>

   {/* Command Prefix & Features */}
   <div className="grid grid-cols-2 gap-2 text-xs">
   <div className="p-2.5 bg-vylant-navy rounded-xl border border-[#383a40]">
    <span className="text-[10px] text-[#949ba4] block">Command Prefix</span>
    <code className="font-mono text-indigo-400 font-bold text-sm">
    {bot.prefix || '!'}
    </code>
   </div>
   <div className="p-2.5 bg-vylant-navy rounded-xl border border-[#383a40]">
    <span className="text-[10px] text-[#949ba4] block">Commands Available</span>
    <span className="font-bold text-white text-sm">
    {bot.commands?.length || 5} Commands
    </span>
   </div>
   </div>

   {/* Commands preview list */}
   {bot.commands && bot.commands.length > 0 && (
   <div className="space-y-1.5">
    <span className="text-[10px] text-[#b5bac1] font-semibold uppercase tracking-wider block">
    Popular Commands
    </span>
    <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
    {bot.commands.slice(0, 5).map((cmd: any, i: number) => {
     const cmdStr = `${bot.prefix || '!'}${cmd.name}`;
     return (
     <div
      key={i}
      onClick={() => handleCopyCommand(cmdStr)}
      className="p-2 bg-vylant-navy hover:bg-[#35373c] rounded-lg border border-[#383a40] flex items-center justify-between cursor-pointer transition-colors"
      title="Click to copy command"
     >
      <div className="flex items-center gap-1.5">
      <Terminal className="w-3 h-3 text-indigo-400" />
      <span className="text-indigo-300 font-bold">{cmdStr}</span>
      <span className="text-[#949ba4] text-[11px] font-sans ml-1">
       - {cmd.description}
      </span>
      </div>
      {copiedCmd === cmdStr ? (
      <Check className="w-3 h-3 text-emerald-400" />
      ) : (
      <Copy className="w-3 h-3 text-[#949ba4]" />
      )}
     </div>
     );
    })}
    </div>
   </div>
   )}

   {/* Add to Server section */}
   <div className="pt-2 border-t border-[#383a40] space-y-2">
   <div className="flex items-center gap-2">
    <select
    value={selectedServerId}
    onChange={e => setSelectedServerId(e.target.value)}
    className="flex-1 px-3 py-2 bg-vylant-navy border border-[#383a40] rounded-xl text-white text-xs outline-none"
    >
    <option value="">Select a server to add...</option>
    {servers.map(s => (
     <option key={s.id} value={s.id}>
     {s.name}
     </option>
    ))}
    </select>

    <button
    onClick={handleInstall}
    disabled={!selectedServerId || installing}
    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 shadow-md"
    >
    {installSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Plus className="w-4 h-4" />}
    {installSuccess ? 'Added!' : 'Add to Server'}
    </button>
   </div>
   </div>
  </div>
  </motion.div>
 </div>
 );
};
