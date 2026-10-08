import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Forward, 
  Send, 
  Check, 
  Hash, 
  Users, 
  User, 
  Server as ServerIcon,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Mic,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export interface ForwardTarget {
  type: 'dm' | 'group' | 'server';
  targetId: string;       // username for dm, groupId for group, serverId for server
  channelId?: string;     // channelId if server
  displayName: string;    // e.g. "@Bob", "Dev Team", "#general"
  subName?: string;       // e.g. "Direct Message", "Group Chat", "Server Name"
  icon?: string;
}

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: any | null;
  sourceContext?: string;
  isDarkMode?: boolean;
  currentUserName: string;
  friends?: any[];
  recentDMs?: any[];
  groupChats?: any[];
  servers?: any[];
  onSendForward: (target: ForwardTarget, originalMessage: any, comment?: string) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  sourceContext,
  isDarkMode = true,
  currentUserName,
  friends = [],
  recentDMs = [],
  groupChats = [],
  servers = [],
  onSendForward
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [commentText, setCommentText] = useState('');
  const [sentTargets, setSentTargets] = useState<Set<string>>(new Set());
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setCommentText('');
      setSentTargets(new Set());
      // Expand first 2 servers by default
      if (servers.length > 0) {
        setExpandedServers(new Set(servers.slice(0, 2).map((s: any) => s.id)));
      }
    }
  }, [isOpen, servers]);

  // Combine unique DM contacts (friends + recent DMs excluding self)
  const dmContacts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; image?: string; status?: string }>();
    recentDMs.forEach((dm: any) => {
      if (dm?.name && dm.name !== currentUserName) {
        map.set(dm.name, {
          id: dm.id || dm.name,
          name: dm.name,
          image: dm.image,
          status: dm.status
        });
      }
    });
    friends.forEach((fr: any) => {
      if (fr?.name && fr.name !== currentUserName && !map.has(fr.name)) {
        map.set(fr.name, {
          id: fr.id || fr.name,
          name: fr.name,
          image: fr.image,
          status: fr.status
        });
      }
    });
    return Array.from(map.values());
  }, [friends, recentDMs, currentUserName]);

  // Filtered lists based on search
  const filteredDMs = useMemo(() => {
    if (!searchQuery.trim()) return dmContacts;
    return dmContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [dmContacts, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupChats;
    return groupChats.filter((g: any) => g.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groupChats, searchQuery]);

  const filteredServers = useMemo(() => {
    if (!searchQuery.trim()) return servers;
    const query = searchQuery.toLowerCase();
    return servers
      .map((s: any) => {
        const serverMatch = s.name?.toLowerCase().includes(query);
        const matchedChannels = (s.channels || []).filter((c: any) => 
          (c.type === 'text' || !c.type) && c.name?.toLowerCase().includes(query)
        );
        if (serverMatch) return s;
        if (matchedChannels.length > 0) {
          return { ...s, channels: matchedChannels };
        }
        return null;
      })
      .filter(Boolean);
  }, [servers, searchQuery]);

  if (!isOpen || !message) return null;

  const handleSend = (target: ForwardTarget, key: string) => {
    if (sentTargets.has(key)) return;
    onSendForward(target, message, commentText.trim() ? commentText.trim() : undefined);
    setSentTargets(prev => new Set(prev).add(key));
  };

  const toggleServerExpand = (serverId: string) => {
    setExpandedServers(prev => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  const resolvedSource = message.isForwarded && message.forwardedFrom
    ? message.forwardedFrom
    : (sourceContext || (message.sender ? `@${message.sender}` : 'Chat'));

  return (
    <AnimatePresence>
      <div 
        id="forward-message-modal-overlay"
        className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          id="forward-message-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`w-full max-w-lg rounded-2xl shadow-2xl border flex flex-col overflow-hidden max-h-[90vh] ${
            isDarkMode 
              ? 'bg-[#1a1c23] border-white/10 text-white' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${
            isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-vylant-blue/15 text-vylant-blue flex items-center justify-center">
                <Forward size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Forward Message</h3>
                <p className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                  Share this message with friends, groups, or channels
                </p>
              </div>
            </div>
            <button
              id="forward-message-close-btn"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-800'
              }`}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Message Preview Box */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-100 bg-slate-50'}`}>
            <div className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
              isDarkMode ? 'bg-[#15161c] border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold truncate text-vylant-blue">
                  <Forward size={13} className="shrink-0" />
                  <span className="truncate">Forwarding from {resolvedSource}</span>
                </div>
                {message.sender && (
                  <span className={`text-[11px] truncate shrink-0 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                    by {message.sender}
                  </span>
                )}
              </div>

              {message.text ? (
                <p className={`text-xs line-clamp-3 leading-relaxed whitespace-pre-wrap ${
                  isDarkMode ? 'text-white/80' : 'text-slate-700'
                }`}>
                  {message.text}
                </p>
              ) : (
                <div className={`flex items-center gap-1.5 text-xs italic ${
                  isDarkMode ? 'text-white/50' : 'text-slate-500'
                }`}>
                  {message.image ? <><ImageIcon size={13} /> Photo</> :
                   message.audio ? <><Mic size={13} /> Voice message</> :
                   message.file ? <><FileText size={13} /> Attachment</> :
                   message.poll ? <><MessageSquare size={13} /> Poll</> :
                   'Forwarded content'}
                </div>
              )}
            </div>

            {/* Optional Comment Input */}
            <div className="mt-3">
              <input
                id="forward-message-comment-input"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add an optional comment..."
                className={`w-full px-3.5 py-2 text-xs rounded-xl border transition-all outline-none ${
                  isDarkMode
                    ? 'bg-[#15161c] border-white/10 text-white placeholder-white/30 focus:border-vylant-blue'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-vylant-blue'
                }`}
              />
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-transparent">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
              isDarkMode 
                ? 'bg-black/20 border-white/10 text-white focus-within:border-vylant-blue' 
                : 'bg-slate-100/80 border-slate-200 text-slate-900 focus-within:border-vylant-blue'
            }`}>
              <Search size={15} className={isDarkMode ? 'text-white/40' : 'text-slate-400'} />
              <input
                id="forward-message-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends, groups, or channels..."
                className="w-full bg-transparent text-xs outline-none placeholder-inherit"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className={`p-0.5 rounded-md ${isDarkMode ? 'hover:bg-white/10 text-white/50' : 'hover:bg-slate-200 text-slate-400'}`}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Destination Lists */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-[220px]">
            {/* Direct Messages Section */}
            {filteredDMs.length > 0 && (
              <div>
                <div className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDarkMode ? 'text-white/40' : 'text-slate-400'
                }`}>
                  <User size={12} />
                  <span>Direct Messages</span>
                </div>
                <div className="space-y-1 mt-1">
                  {filteredDMs.map((dm) => {
                    const targetKey = `dm-${dm.name}`;
                    const isSent = sentTargets.has(targetKey);
                    return (
                      <div
                        key={dm.name}
                        className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                          isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {dm.image ? (
                            <img 
                              src={dm.image} 
                              alt={dm.name} 
                              className="w-8 h-8 rounded-full object-cover shrink-0" 
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-vylant-blue/20 text-vylant-blue flex items-center justify-center font-bold text-xs shrink-0">
                              {dm.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate min-w-0">
                            <div className="text-xs font-semibold truncate leading-tight">
                              @{dm.name}
                            </div>
                            <div className={`text-[10px] truncate ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                              Direct Message
                            </div>
                          </div>
                        </div>

                        <button
                          id={`forward-send-dm-${dm.name}`}
                          onClick={() => handleSend({
                            type: 'dm',
                            targetId: dm.name,
                            displayName: `@${dm.name}`,
                            subName: 'Direct Message',
                            icon: dm.image
                          }, targetKey)}
                          disabled={isSent}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                            isSent
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                              : 'bg-vylant-blue hover:bg-vylant-blue/90 text-black active:scale-95 shadow-md shadow-vylant-blue/20'
                          }`}
                        >
                          {isSent ? (
                            <>
                              <Check size={13} />
                              <span>Sent</span>
                            </>
                          ) : (
                            <>
                              <Send size={12} />
                              <span>Send</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group Chats Section */}
            {filteredGroups.length > 0 && (
              <div>
                <div className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDarkMode ? 'text-white/40' : 'text-slate-400'
                }`}>
                  <Users size={12} />
                  <span>Group Chats</span>
                </div>
                <div className="space-y-1 mt-1">
                  {filteredGroups.map((gc: any) => {
                    const targetKey = `group-${gc.id || gc.name}`;
                    const isSent = sentTargets.has(targetKey);
                    return (
                      <div
                        key={gc.id || gc.name}
                        className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                          isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                            <Users size={15} />
                          </div>
                          <div className="truncate min-w-0">
                            <div className="text-xs font-semibold truncate leading-tight">
                              {gc.name}
                            </div>
                            <div className={`text-[10px] truncate ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                              {gc.members?.length || 0} members
                            </div>
                          </div>
                        </div>

                        <button
                          id={`forward-send-group-${gc.id || gc.name}`}
                          onClick={() => handleSend({
                            type: 'group',
                            targetId: gc.id,
                            displayName: gc.name,
                            subName: 'Group Chat'
                          }, targetKey)}
                          disabled={isSent}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                            isSent
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                              : 'bg-vylant-blue hover:bg-vylant-blue/90 text-black active:scale-95 shadow-md shadow-vylant-blue/20'
                          }`}
                        >
                          {isSent ? (
                            <>
                              <Check size={13} />
                              <span>Sent</span>
                            </>
                          ) : (
                            <>
                              <Send size={12} />
                              <span>Send</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Server Channels Section */}
            {filteredServers.length > 0 && (
              <div>
                <div className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDarkMode ? 'text-white/40' : 'text-slate-400'
                }`}>
                  <ServerIcon size={12} />
                  <span>Servers & Channels</span>
                </div>
                <div className="space-y-2 mt-1">
                  {filteredServers.map((server: any) => {
                    const isExpanded = expandedServers.has(server.id);
                    const textChannels = (server.channels || []).filter((c: any) => c.type === 'text' || !c.type);

                    return (
                      <div 
                        key={server.id} 
                        className={`rounded-xl border overflow-hidden transition-all ${
                          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <button
                          onClick={() => toggleServerExpand(server.id)}
                          className={`w-full flex items-center justify-between p-2.5 text-left transition-colors ${
                            isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {server.icon ? (
                              <img src={server.icon} alt={server.name} className="w-6 h-6 rounded-lg object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                {server.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-semibold truncate">{server.name}</span>
                            <span className={`text-[10px] ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                              ({textChannels.length} text {textChannels.length === 1 ? 'channel' : 'channels'})
                            </span>
                          </div>
                          <div className={isDarkMode ? 'text-white/40' : 'text-slate-400'}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className={`p-1.5 space-y-1 border-t ${
                            isDarkMode ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-white'
                          }`}>
                            {textChannels.length === 0 ? (
                              <div className={`p-2 text-center text-xs italic ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                                No text channels available
                              </div>
                            ) : (
                              textChannels.map((channel: any) => {
                                const targetKey = `server-${server.id}-${channel.id}`;
                                const isSent = sentTargets.has(targetKey);
                                return (
                                  <div
                                    key={channel.id}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                                      isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <Hash size={14} className={isDarkMode ? 'text-white/40' : 'text-slate-400'} />
                                      <span className="text-xs font-medium truncate">{channel.name}</span>
                                    </div>

                                    <button
                                      id={`forward-send-channel-${channel.id}`}
                                      onClick={() => handleSend({
                                        type: 'server',
                                        targetId: server.id,
                                        channelId: channel.id,
                                        displayName: `#${channel.name}`,
                                        subName: server.name
                                      }, targetKey)}
                                      disabled={isSent}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                                        isSent
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                                          : 'bg-vylant-blue hover:bg-vylant-blue/90 text-black active:scale-95 shadow-md shadow-vylant-blue/20'
                                      }`}
                                    >
                                      {isSent ? (
                                        <>
                                          <Check size={13} />
                                          <span>Sent</span>
                                        </>
                                      ) : (
                                        <>
                                          <Send size={12} />
                                          <span>Send</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredDMs.length === 0 && filteredGroups.length === 0 && filteredServers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-50 text-center">
                <Search size={32} className="mb-2 opacity-40" />
                <p className="text-xs font-medium">No destinations match "{searchQuery}"</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-3 px-5 border-t flex items-center justify-between ${
            isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
          }`}>
            <span className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>
              {sentTargets.size > 0 ? `Sent to ${sentTargets.size} destination${sentTargets.size > 1 ? 's' : ''}` : 'Select destinations to forward'}
            </span>
            <button
              id="forward-message-done-btn"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                sentTargets.size > 0
                  ? 'bg-vylant-blue text-black hover:bg-vylant-blue/90'
                  : isDarkMode
                    ? 'bg-white/10 hover:bg-white/15 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              {sentTargets.size > 0 ? 'Done' : 'Cancel'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
