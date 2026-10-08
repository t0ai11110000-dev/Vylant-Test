import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeletePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  presetName: string;
  isDarkMode: boolean;
}

const DeletePresetModal: React.FC<DeletePresetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  presetName,
  isDarkMode
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className={`relative w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden border ${
            isDarkMode 
              ? 'bg-[#14151a] border-white/10 text-white' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Close button */}
          <button 
            onClick={onClose} 
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-slate-100 text-slate-400'
            }`}
          >
            <X size={20} />
          </button>

          {/* Heading with Alert Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500">
              <AlertTriangle size={24} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-bold">Delete Preset</h2>
          </div>

          {/* Warning Messages */}
          <div className="space-y-3 mb-6">
            <p className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-slate-600'}`}>
              Are you sure you want to delete the preset <span className="font-semibold text-red-400">"{presetName}"</span>?
            </p>
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium leading-relaxed ${
              isDarkMode 
                ? 'bg-red-500/5 border-red-500/20 text-red-400' 
                : 'bg-red-50 border-red-100 text-red-600'
            }`}>
              <span className="font-bold select-none uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-500/10 text-[9px]">Warning</span>
              <span>This action is permanent and cannot be undone. Other users will no longer be able to discover or import this preset.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                isDarkMode 
                  ? 'bg-white/5 hover:bg-white/10 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Delete Preset
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeletePresetModal;
