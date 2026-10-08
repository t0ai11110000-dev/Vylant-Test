import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, BarChart2, Clock } from 'lucide-react';

interface AttachMenuPopoverProps {
 isOpen: boolean;
 onClose: () => void;
 onAttachImage: () => void;
 onCreatePoll: () => void;
 onScheduleMessage?: () => void;
 onOpenGifPicker?: () => void;
 isDarkMode: boolean;
}

export const AttachMenuPopover: React.FC<AttachMenuPopoverProps> = ({
 isOpen,
 onClose,
 onAttachImage,
 onCreatePoll,
 onScheduleMessage,
 onOpenGifPicker,
 isDarkMode,
}) => {
 const menuRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
   if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
    onClose();
   }
  };

  if (isOpen) {
   document.addEventListener('mousedown', handleClickOutside);
  }
  return () => {
   document.removeEventListener('mousedown', handleClickOutside);
  };
 }, [isOpen, onClose]);

 if (!isOpen) return null;

 return (
  <AnimatePresence>
   <motion.div
    ref={menuRef}
    initial={{ opacity: 0, scale: 0.9, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: 10 }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
    className={`absolute bottom-full left-0 mb-3 z-[9990] min-w-[240px] p-2 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl ${
     isDarkMode
      ? 'bg-navy-900/95 border-white/10 text-white shadow-black/50'
      : 'bg-white/95 border-navy-200 text-navy-800 shadow-slate-300/50'
    }`}
   >
    <div className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 opacity-50">
     Actions
    </div>
    <div className="flex flex-col gap-1">
     {/* Attach Image & Files Option */}
     <button
      type="button"
      onClick={() => {
       onClose();
       onAttachImage();
      }}
      className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-all ${
       isDarkMode
        ? 'hover:bg-white/10 text-white'
        : 'hover:bg-navy-100 text-navy-900'
      }`}
     >
      <div className="p-2 rounded-xl bg-vylant-blue/10 text-vylant-blue border border-vylant-blue/20">
       <Image size={18} />
      </div>
      <div>
       <div className="font-bold text-xs">Attach Image / File</div>
       <div className="text-[10px] opacity-60">Upload photos, videos, or files</div>
      </div>
     </button>

     {/* Send GIF Option */}
     {onOpenGifPicker && (
      <button
       type="button"
       onClick={() => {
        onClose();
        onOpenGifPicker();
       }}
       className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-all ${
        isDarkMode
         ? 'hover:bg-white/10 text-white'
         : 'hover:bg-navy-100 text-navy-900'
       }`}
      >
       <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
        <span className="font-black text-xs font-mono">GIF</span>
       </div>
       <div>
        <div className="font-bold text-xs">Choose a GIF</div>
        <div className="text-[10px] opacity-60">Search & send animated GIFs</div>
       </div>
      </button>
     )}

     {/* Create Poll Option */}
     <button
      type="button"
      onClick={() => {
       onClose();
       onCreatePoll();
      }}
      className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-all ${
       isDarkMode
        ? 'hover:bg-white/10 text-white'
        : 'hover:bg-navy-100 text-navy-900'
      }`}
     >
      <div className="p-2 rounded-xl bg-vylant-blue/20 text-vylant-blue border border-vylant-blue/30">
       <BarChart2 size={18} />
      </div>
      <div>
       <div className="font-bold text-xs">Create Poll</div>
       <div className="text-[10px] opacity-60">Gather votes with live options</div>
      </div>
     </button>

     {/* Schedule Message Option */}
     {onScheduleMessage && (
      <button
       type="button"
       onClick={() => {
        onClose();
        onScheduleMessage();
       }}
       className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-all ${
        isDarkMode
         ? 'hover:bg-white/10 text-white'
         : 'hover:bg-navy-100 text-navy-900'
       }`}
      >
       <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <Clock size={18} />
       </div>
       <div>
        <div className="font-bold text-xs">Schedule Message</div>
        <div className="text-[10px] opacity-60">Send later at a specific time</div>
       </div>
      </button>
     )}
    </div>
   </motion.div>
  </AnimatePresence>
 );
};
