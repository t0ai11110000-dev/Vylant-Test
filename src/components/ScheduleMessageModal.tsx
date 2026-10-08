import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
 X, 
 Clock, 
 Send, 
 Sparkles, 
 AlertCircle, 
 ListOrdered,
 Paperclip,
 Check
} from 'lucide-react';

export interface ScheduledMessagePayload {
 targetType: 'dm' | 'group' | 'server';
 targetId: string;
 channelId?: string;
 targetName?: string;
 messageText: string;
 attachments?: Array<{
  url: string;
  type: 'image' | 'video' | 'file' | 'audio';
  name?: string;
  size?: number;
  isSpoiler?: boolean;
 }>;
 audio?: string;
 audioDuration?: number;
 scheduledFor: number;
}

interface ScheduleMessageModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSchedule: (payload: ScheduledMessagePayload) => Promise<void> | void;
 onOpenManager?: () => void;
 targetType: 'dm' | 'group' | 'server';
 targetId: string;
 channelId?: string;
 targetName: string;
 initialText?: string;
 attachments?: Array<{
  url: string;
  type: 'image' | 'video' | 'file' | 'audio';
  name?: string;
  size?: number;
  isSpoiler?: boolean;
 }>;
 audio?: string;
 audioDuration?: number;
 isDarkMode: boolean;
 scheduledCount?: number;
}

export const ScheduleMessageModal: React.FC<ScheduleMessageModalProps> = ({
 isOpen,
 onClose,
 onSchedule,
 onOpenManager,
 targetType,
 targetId,
 channelId,
 targetName,
 initialText = '',
 attachments = [],
 audio,
 audioDuration,
 isDarkMode,
 scheduledCount = 0,
}) => {
 const [text, setText] = useState<string>(initialText);
 const [selectedMode, setSelectedMode] = useState<'preset' | 'custom'>('preset');
 const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
 
 // Custom Date & Time State
 const [customDate, setCustomDate] = useState<string>('');
 const [customTime, setCustomTime] = useState<string>('');
 const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);

 // Initialize date/time on open
 useEffect(() => {
  if (isOpen) {
   setText(initialText);
   setError(null);
   setIsSubmitting(false);

   const now = new Date();
   // Default custom date to today
   const year = now.getFullYear();
   const month = String(now.getMonth() + 1).padStart(2, '0');
   const day = String(now.getDate()).padStart(2, '0');
   setCustomDate(`${year}-${month}-${day}`);

   // Default custom time to 1 hour from now
   const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
   const hours = String(oneHourLater.getHours()).padStart(2, '0');
   const minutes = String(oneHourLater.getMinutes()).padStart(2, '0');
   setCustomTime(`${hours}:${minutes}`);
  }
 }, [isOpen, initialText]);

 if (!isOpen) return null;

 // Preset generator based on current time
 const getPresets = () => {
  const now = new Date();
  
  // 15 min
  const in15Min = new Date(now.getTime() + 15 * 60 * 1000);
  // 30 min
  const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
  // 1 hour
  const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
  // 3 hours
  const in3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  // Tomorrow 9:00 AM
  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  // Tomorrow 1:00 PM
  const tomorrow1pm = new Date(now);
  tomorrow1pm.setDate(tomorrow1pm.getDate() + 1);
  tomorrow1pm.setHours(13, 0, 0, 0);

  // Tomorrow 6:00 PM
  const tomorrow6pm = new Date(now);
  tomorrow6pm.setDate(tomorrow6pm.getDate() + 1);
  tomorrow6pm.setHours(18, 0, 0, 0);

  // This weekend / Next Monday 9:00 AM
  const nextMonday = new Date(now);
  const day = nextMonday.getDay();
  const daysUntilMonday = (day === 0 ? 1 : 8 - day);
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);

  return [
   { id: '15m', label: 'In 15 minutes', time: in15Min },
   { id: '30m', label: 'In 30 minutes', time: in30Min },
   { id: '1h', label: 'In 1 hour', time: in1Hour },
   { id: '3h', label: 'In 3 hours', time: in3Hours },
   { id: 'tom9', label: 'Tomorrow morning (9:00 AM)', time: tomorrow9am },
   { id: 'tom1', label: 'Tomorrow afternoon (1:00 PM)', time: tomorrow1pm },
   { id: 'tom6', label: 'Tomorrow evening (6:00 PM)', time: tomorrow6pm },
   { id: 'mon9', label: 'Next Monday (9:00 AM)', time: nextMonday }
  ];
 };

 const presets = getPresets();

 const getTargetScheduledTime = (): number => {
  if (selectedMode === 'preset') {
   const preset = presets[selectedPresetIndex];
   return preset ? preset.time.getTime() : Date.now() + 15 * 60 * 1000;
  } else {
   if (!customDate || !customTime) return 0;
   const combined = new Date(`${customDate}T${customTime}`);
   return combined.getTime();
  }
 };

 const scheduledTimestamp = getTargetScheduledTime();
 const isTimeInFuture = scheduledTimestamp > Date.now() + 1000;

 // Format relative countdown
 const getRelativeSummary = (targetTs: number): string => {
  if (!targetTs || isNaN(targetTs)) return 'Invalid date or time';
  const diffMs = targetTs - Date.now();
  if (diffMs <= 0) return 'Selected time has already passed';

  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  const formattedDate = new Date(targetTs).toLocaleString(undefined, {
   weekday: 'short',
   month: 'short',
   day: 'numeric',
   hour: 'numeric',
   minute: '2-digit'
  });

  if (diffMinutes < 60) {
   return `Sends in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} (${formattedDate})`;
  } else if (diffHours < 24) {
   return `Sends in ~${diffHours} hour${diffHours === 1 ? '' : 's'} (${formattedDate})`;
  } else {
   return `Sends in ${diffDays} day${diffDays === 1 ? '' : 's'} (${formattedDate})`;
  }
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!text.trim() && attachments.length === 0 && !audio) {
   setError('Please enter a message or include an attachment.');
   return;
  }

  if (!isTimeInFuture) {
   setError('Scheduled time must be in the future.');
   return;
  }

  try {
   setIsSubmitting(true);
   setError(null);
   await onSchedule({
    targetType,
    targetId,
    channelId,
    targetName,
    messageText: text,
    attachments,
    audio,
    audioDuration,
    scheduledFor: scheduledTimestamp
   });
   onClose();
  } catch (err: any) {
   setError(err?.message || 'Failed to schedule message. Please try again.');
  } finally {
   setIsSubmitting(false);
  }
 };

 return (
  <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
   <div
    className={`relative w-full max-w-xl rounded-3xl p-5 sm:p-7 border shadow-2xl flex flex-col gap-5 my-auto max-h-[92vh] overflow-y-auto ${
     isDarkMode
      ? 'bg-[#0f121a] border-white/10 text-white shadow-black/80'
      : 'bg-white border-navy-200 text-navy-900 shadow-slate-300'
    }`}
   >
    {/* Close Button */}
    <button
     onClick={onClose}
     aria-label="Close modal"
     className={`absolute top-4 right-4 p-2.5 rounded-full transition-all z-10 ${
      isDarkMode
       ? 'hover:bg-white/10 text-white/60 hover:text-white'
       : 'hover:bg-navy-100 text-navy-400 hover:text-navy-700'
     }`}
    >
     <X size={20} />
    </button>

    {/* Header */}
    <div className="flex items-start gap-3.5 pr-8">
     <div className="p-3 rounded-2xl bg-vylant-blue/15 text-vylant-blue border border-vylant-blue/30 shadow-lg shadow-vylant-blue/10 shrink-0">
      <Clock size={24} />
     </div>
     <div>
      <div className="flex items-center gap-2">
       <h2 className="text-xl sm:text-2xl font-black tracking-tight">Schedule Message</h2>
       <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-vylant-blue/20 text-vylant-blue border border-vylant-blue/30">
        Automated
       </span>
      </div>
      <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? 'text-white/60' : 'text-navy-500'}`}>
       Send to <span className="font-bold text-vylant-blue">{targetName}</span> at a specified time
      </p>
     </div>
    </div>

    {/* Form */}
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
     {/* Message Content Area */}
     <div>
      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-white/70' : 'text-navy-600'}`}>
       Message Content
      </label>
      <textarea
       value={text}
       onChange={(e) => setText(e.target.value)}
       placeholder={`Type the message to send to ${targetName}...`}
       rows={3}
       className={`w-full rounded-2xl p-3.5 text-sm resize-none focus:outline-none focus:border-vylant-blue/60 transition-all border ${
        isDarkMode
         ? 'bg-black/30 border-white/10 text-white placeholder:text-white/30'
         : 'bg-navy-50 border-navy-200 text-navy-900 placeholder:text-navy-400'
       }`}
      />

      {/* Attached Items preview if any */}
      {(attachments.length > 0 || audio) && (
       <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((att, i) => (
         <div
          key={i}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border ${
           isDarkMode ? 'bg-white/5 border-white/10 text-white/80' : 'bg-navy-100 border-navy-200 text-navy-700'
          }`}
         >
          <Paperclip size={12} className="text-vylant-blue" />
          <span className="truncate max-w-[150px]">{att.name || att.type}</span>
         </div>
        ))}
        {audio && (
         <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border ${
           isDarkMode ? 'bg-white/5 border-white/10 text-white/80' : 'bg-navy-100 border-navy-200 text-navy-700'
          }`}
         >
          <span className="text-vylant-blue font-bold">🎙️ Voice Note</span>
          {audioDuration && <span className="opacity-60">{Math.round(audioDuration)}s</span>}
         </div>
        )}
       </div>
      )}
     </div>

     {/* Timing Mode Tabs */}
     <div>
      <div className="flex items-center justify-between mb-2">
       <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white/70' : 'text-navy-600'}`}>
        Delivery Time
       </label>
       <div className="flex items-center gap-1 p-0.5 rounded-xl border bg-black/10 dark:border-white/10 border-navy-200">
        <button
         type="button"
         onClick={() => setSelectedMode('preset')}
         className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
          selectedMode === 'preset'
           ? 'bg-vylant-blue text-black shadow-sm'
           : isDarkMode ? 'text-white/60 hover:text-white' : 'text-navy-600 hover:text-navy-900'
         }`}
        >
         Quick Presets
        </button>
        <button
         type="button"
         onClick={() => setSelectedMode('custom')}
         className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
          selectedMode === 'custom'
           ? 'bg-vylant-blue text-black shadow-sm'
           : isDarkMode ? 'text-white/60 hover:text-white' : 'text-navy-600 hover:text-navy-900'
         }`}
        >
         Custom Time
        </button>
       </div>
      </div>

      {selectedMode === 'preset' ? (
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {presets.map((preset, idx) => {
         const isSelected = selectedPresetIndex === idx;
         const formatted = preset.time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
         return (
          <button
           key={preset.id}
           type="button"
           onClick={() => setSelectedPresetIndex(idx)}
           className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
            isSelected
             ? 'border-vylant-blue bg-vylant-blue/15 text-vylant-blue shadow-md shadow-vylant-blue/10'
             : isDarkMode
              ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/80'
              : 'border-navy-200 bg-navy-50 hover:bg-navy-100 text-navy-700'
           }`}
          >
           <div className="min-w-0 pr-2">
            <div className="text-xs font-bold truncate">{preset.label}</div>
            <div className="text-[11px] opacity-60 flex items-center gap-1 mt-0.5">
             <Clock size={11} />
             <span>{formatted}</span>
            </div>
           </div>
           {isSelected && (
            <div className="w-5 h-5 rounded-full bg-vylant-blue text-black flex items-center justify-center shrink-0">
             <Check size={12} strokeWidth={3} />
            </div>
           )}
          </button>
         );
        })}
       </div>
      ) : (
       <div className={`p-4 rounded-2xl border flex flex-col gap-3.5 ${
        isDarkMode ? 'bg-black/20 border-white/10' : 'bg-navy-50 border-navy-200'
       }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-white/60' : 'text-navy-500'}`}>
           Date
          </label>
          <div className="relative">
           <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className={`w-full rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-vylant-blue/60 border ${
             isDarkMode
              ? 'bg-[#151922] border-white/10 text-white'
              : 'bg-white border-navy-200 text-navy-900'
            }`}
           />
          </div>
         </div>
         <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-white/60' : 'text-navy-500'}`}>
           Time
          </label>
          <div className="relative">
           <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className={`w-full rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-vylant-blue/60 border ${
             isDarkMode
              ? 'bg-[#151922] border-white/10 text-white'
              : 'bg-white border-navy-200 text-navy-900'
            }`}
           />
          </div>
         </div>
        </div>
       </div>
      )}
     </div>

     {/* Real-time Summary Card */}
     <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
      isTimeInFuture
       ? (isDarkMode ? 'bg-vylant-blue/10 border-vylant-blue/30 text-white' : 'bg-cyan-50 border-cyan-200 text-navy-800')
       : (isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
     }`}>
      <Sparkles size={18} className={isTimeInFuture ? 'text-vylant-blue shrink-0' : 'text-red-400 shrink-0'} />
      <div className="text-xs leading-relaxed">
       <span className="font-bold">Scheduled Delivery: </span>
       <span>{getRelativeSummary(scheduledTimestamp)}</span>
      </div>
     </div>

     {/* Error notice */}
     {error && (
      <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
       <AlertCircle size={16} className="shrink-0" />
       <span>{error}</span>
      </div>
     )}

     {/* Action Buttons */}
     <div className="flex items-center justify-between gap-3 pt-2">
      {onOpenManager ? (
       <button
        type="button"
        onClick={() => {
         onClose();
         onOpenManager();
        }}
        className={`text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
         isDarkMode ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-navy-600 hover:text-navy-900 hover:bg-navy-100'
        }`}
       >
        <ListOrdered size={14} className="text-vylant-blue" />
        <span>View Scheduled {scheduledCount > 0 ? `(${scheduledCount})` : ''}</span>
       </button>
      ) : <div />}

      <div className="flex items-center gap-2">
       <button
        type="button"
        onClick={onClose}
        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
         isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-navy-100 text-navy-500 hover:text-navy-800'
        }`}
       >
        Cancel
       </button>
       <button
        type="submit"
        disabled={isSubmitting || !isTimeInFuture || (!text.trim() && attachments.length === 0 && !audio)}
        className="px-5 py-2.5 bg-vylant-blue text-black hover:bg-cyan-300 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-vylant-blue/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
       >
        {isSubmitting ? (
         <span>Scheduling...</span>
        ) : (
         <>
          <Clock size={15} />
          <span>Schedule Message</span>
         </>
        )}
       </button>
      </div>
     </div>
    </form>
   </div>
  </div>
 );
};
