import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Clock,
  Send,
  Trash2,
  Edit2,
  Search,
  MessageSquare,
  Hash,
  Users,
  Check,
  Plus,
  Paperclip,
  Sparkles
} from 'lucide-react';

export interface ScheduledMessageItem {
  id: string;
  sender: string;
  targetType: 'dm' | 'group' | 'server';
  targetId: string;
  channelId?: string;
  targetName?: string;
  message: {
    id: string;
    text: string;
    attachments?: Array<{
      url: string;
      type: 'image' | 'video' | 'file' | 'audio';
      name?: string;
      size?: number;
    }>;
    audio?: string;
    audioDuration?: number;
    timestamp?: number;
    [key: string]: any;
  };
  scheduledFor: number;
  createdAt: number;
  status: 'pending' | 'sent' | 'cancelled';
}

interface ScheduledMessagesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledMessages: ScheduledMessageItem[];
  currentChatTarget?: {
    type: 'dm' | 'group' | 'server';
    id: string;
    channelId?: string;
    name: string;
  };
  onSendNow: (id: string) => Promise<void> | void;
  onCancel: (id: string) => Promise<void> | void;
  onUpdate: (id: string, updates: { messageText?: string; scheduledFor?: number }) => Promise<void> | void;
  onOpenCreateNew?: () => void;
  isDarkMode: boolean;
}

export const ScheduledMessagesManagerModal: React.FC<ScheduledMessagesManagerModalProps> = ({
  isOpen,
  onClose,
  scheduledMessages,
  currentChatTarget,
  onSendNow,
  onCancel,
  onUpdate,
  onOpenCreateNew,
  isDarkMode,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'current'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter messages
  const filteredMessages = scheduledMessages.filter((item) => {
    if (item.status !== 'pending') return false;

    // Filter by current chat if selected
    if (filterTab === 'current' && currentChatTarget) {
      if (item.targetType !== currentChatTarget.type) return false;
      if (item.targetType === 'server') {
        if (item.targetId !== currentChatTarget.id || item.channelId !== currentChatTarget.channelId) {
          return false;
        }
      } else {
        if (item.targetId.toLowerCase() !== currentChatTarget.id.toLowerCase()) return false;
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (item.message?.text || '').toLowerCase().includes(q);
      const matchTarget = (item.targetName || item.targetId || '').toLowerCase().includes(q);
      if (!matchText && !matchTarget) return false;
    }

    return true;
  });

  // Sort by earliest scheduled first
  filteredMessages.sort((a, b) => a.scheduledFor - b.scheduledFor);

  const startEditing = (item: ScheduledMessageItem) => {
    setEditingId(item.id);
    setEditText(item.message?.text || '');
    const schedDate = new Date(item.scheduledFor);
    const y = schedDate.getFullYear();
    const m = String(schedDate.getMonth() + 1).padStart(2, '0');
    const d = String(schedDate.getDate()).padStart(2, '0');
    setEditDate(`${y}-${m}-${d}`);
    const hr = String(schedDate.getHours()).padStart(2, '0');
    const mn = String(schedDate.getMinutes()).padStart(2, '0');
    setEditTime(`${hr}:${mn}`);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
    setEditDate('');
    setEditTime('');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setActionLoadingId(id);
      let newScheduledFor: number | undefined;
      if (editDate && editTime) {
        const combined = new Date(`${editDate}T${editTime}`);
        if (combined.getTime() > Date.now() + 1000) {
          newScheduledFor = combined.getTime();
        }
      }
      await onUpdate(id, {
        messageText: editText,
        scheduledFor: newScheduledFor
      });
      setEditingId(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendNowAction = async (id: string) => {
    try {
      setActionLoadingId(id);
      await onSendNow(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelAction = async (id: string) => {
    try {
      setActionLoadingId(id);
      await onCancel(id);
      setConfirmDeleteId(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatCountdown = (ts: number) => {
    const diff = ts - Date.now();
    if (diff <= 0) return 'Sending soon...';
    const mins = Math.round(diff / 60000);
    const hrs = Math.round(diff / 3600000);
    const days = Math.round(diff / 86400000);

    const formattedTime = new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    if (mins < 60) {
      return `In ${mins}m (${formattedTime})`;
    } else if (hrs < 24) {
      return `In ${hrs}h (${formattedTime})`;
    } else {
      return `In ${days}d (${formattedTime})`;
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className={`relative w-full max-w-2xl rounded-3xl p-5 sm:p-7 border shadow-2xl flex flex-col gap-5 my-auto max-h-[92vh] overflow-hidden ${
          isDarkMode
            ? 'bg-[#0f121a] border-white/10 text-white shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className={`absolute top-4 right-4 p-2.5 rounded-full transition-all z-10 ${
            isDarkMode
              ? 'hover:bg-white/10 text-white/60 hover:text-white'
              : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
          }`}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 pr-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-vylant-blue/15 text-vylant-blue border border-vylant-blue/30 shadow-lg shadow-vylant-blue/10 shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Scheduled Messages</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-vylant-blue/20 text-vylant-blue border border-vylant-blue/30">
                  {scheduledMessages.filter(s => s.status === 'pending').length}
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                Manage delayed messages waiting to be dispatched
              </p>
            </div>
          </div>

          {onOpenCreateNew && (
            <button
              onClick={() => {
                onClose();
                onOpenCreateNew();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-vylant-blue text-black hover:bg-cyan-300 font-bold text-xs transition-all shadow-md shadow-vylant-blue/20 shrink-0"
            >
              <Plus size={15} />
              <span>Schedule New</span>
            </button>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab Filter */}
          <div className="flex items-center gap-1 p-1 rounded-2xl border bg-black/10 dark:border-white/10 border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterTab === 'all'
                  ? 'bg-vylant-blue text-black shadow-sm'
                  : isDarkMode ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Messages ({scheduledMessages.filter(s => s.status === 'pending').length})
            </button>
            {currentChatTarget && (
              <button
                type="button"
                onClick={() => setFilterTab('current')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  filterTab === 'current'
                    ? 'bg-vylant-blue text-black shadow-sm'
                    : isDarkMode ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Chat ({
                  scheduledMessages.filter(s => {
                    if (s.status !== 'pending') return false;
                    if (s.targetType !== currentChatTarget.type) return false;
                    if (s.targetType === 'server') {
                      return s.targetId === currentChatTarget.id && s.channelId === currentChatTarget.channelId;
                    }
                    return s.targetId.toLowerCase() === currentChatTarget.id.toLowerCase();
                  }).length
                })
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scheduled messages..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-vylant-blue/60 border ${
                isDarkMode
                  ? 'bg-black/20 border-white/10 text-white placeholder:text-white/30'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Messages List Container */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1 flex flex-col gap-3">
          {filteredMessages.length === 0 ? (
            <div className={`py-12 px-4 rounded-3xl border text-center flex flex-col items-center justify-center gap-3 ${
              isDarkMode ? 'bg-white/[0.02] border-white/5 text-white/60' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <div className="p-4 rounded-2xl bg-vylant-blue/10 text-vylant-blue border border-vylant-blue/20">
                <Clock size={32} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">No scheduled messages</h3>
                <p className="text-xs mt-1 max-w-xs opacity-75">
                  {searchQuery
                    ? 'No scheduled messages match your search filter.'
                    : 'You have no pending scheduled messages. Schedule a message to be automatically sent at a future time.'}
                </p>
              </div>
              {onOpenCreateNew && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCreateNew();
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-vylant-blue text-black font-bold text-xs hover:bg-cyan-300 transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Schedule a message now</span>
                </button>
              )}
            </div>
          ) : (
            filteredMessages.map((item) => {
              const isEditing = editingId === item.id;
              const isLoading = actionLoadingId === item.id;
              const isConfirmingDelete = confirmDeleteId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDarkMode
                      ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Target & Time */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-vylant-blue/10 border border-vylant-blue/20 text-vylant-blue text-xs font-bold">
                        {item.targetType === 'server' ? (
                          <>
                            <Hash size={13} />
                            <span>{item.targetName || item.channelId || 'Server Channel'}</span>
                          </>
                        ) : item.targetType === 'group' ? (
                          <>
                            <Users size={13} />
                            <span>{item.targetName || item.targetId}</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare size={13} />
                            <span>@{item.targetName || item.targetId}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 opacity-70">
                        {item.targetType}
                      </span>
                    </div>

                    {/* Countdown pill */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-vylant-blue bg-vylant-blue/10 px-3 py-1 rounded-xl border border-vylant-blue/20">
                      <Clock size={13} />
                      <span>{formatCountdown(item.scheduledFor)}</span>
                    </div>
                  </div>

                  {/* Message Body (or Edit Form) */}
                  {isEditing ? (
                    <div className="flex flex-col gap-3 my-2 p-3 rounded-xl border bg-black/20 dark:border-white/10 border-slate-200">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">
                          Edit Message Text
                        </label>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                          className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:border-vylant-blue/60 ${
                            isDarkMode
                              ? 'bg-black/30 border-white/10 text-white'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                            Reschedule Date
                          </label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className={`w-full p-2 text-xs rounded-xl border focus:outline-none focus:border-vylant-blue/60 ${
                              isDarkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                            Reschedule Time
                          </label>
                          <input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className={`w-full p-2 text-xs rounded-xl border focus:outline-none focus:border-vylant-blue/60 ${
                              isDarkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={isLoading}
                          className="px-4 py-1.5 bg-vylant-blue text-black font-bold text-xs rounded-lg hover:bg-cyan-300 transition-all flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap leading-relaxed">
                        {item.message?.text || <span className="italic opacity-50">No text content</span>}
                      </p>

                      {/* Attachments preview */}
                      {item.message?.attachments && item.message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.message.attachments.map((att, attIdx) => (
                            <div
                              key={attIdx}
                              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-xl border ${
                                isDarkMode ? 'bg-white/5 border-white/10 text-white/80' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <Paperclip size={11} className="text-vylant-blue" />
                              <span className="truncate max-w-[150px]">{att.name || att.type}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Audio preview */}
                      {item.message?.audio && (
                        <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-xl border mt-2 w-fit bg-vylant-blue/10 border-vylant-blue/20 text-vylant-blue font-bold">
                          <span>🎙️ Voice Note</span>
                          {item.message?.audioDuration && <span className="opacity-60">({Math.round(item.message.audioDuration)}s)</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer */}
                  {!isEditing && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t dark:border-white/5 border-slate-200/60">
                      <div className="text-[10px] opacity-50">
                        Created {new Date(item.createdAt).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Send Now Button */}
                        <button
                          type="button"
                          onClick={() => handleSendNowAction(item.id)}
                          disabled={isLoading}
                          title="Send immediately now"
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isDarkMode
                              ? 'bg-vylant-blue/15 text-vylant-blue hover:bg-vylant-blue/25 border border-vylant-blue/30'
                              : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
                          }`}
                        >
                          <Send size={12} />
                          <span>Send Now</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          disabled={isLoading}
                          title="Edit message or reschedule"
                          className={`p-2 rounded-xl transition-all ${
                            isDarkMode
                              ? 'hover:bg-white/10 text-white/70 hover:text-white'
                              : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Cancel / Delete Button */}
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1 bg-red-500/15 p-1 rounded-xl border border-red-500/30">
                            <span className="text-[11px] font-bold text-red-400 px-1">Cancel send?</span>
                            <button
                              type="button"
                              onClick={() => handleCancelAction(item.id)}
                              disabled={isLoading}
                              className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-all"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-white/10 text-white/80 text-[10px] font-bold hover:bg-white/20 transition-all"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            disabled={isLoading}
                            title="Cancel scheduled message"
                            className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t dark:border-white/5 border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 opacity-60 text-[11px]">
            <Sparkles size={13} className="text-vylant-blue" />
            <span>Messages dispatch automatically when timer arrives</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              isDarkMode ? 'hover:bg-white/10 text-white/80' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
