import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart2, Plus, Trash2, X, Clock, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import { Poll } from './PollCard';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (poll: Poll) => void;
  isDarkMode: boolean;
  currentUsername: string;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
  isDarkMode,
  currentUsername,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [durationValue, setDurationValue] = useState<number>(24);
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days' | 'no-limit'>('hours');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const isValid =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const validOptions = options
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    let expiresAt: number | undefined = undefined;
    if (durationUnit !== 'no-limit' && durationValue > 0) {
      let multiplier = 1000 * 60; // minutes
      if (durationUnit === 'hours') multiplier *= 60;
      if (durationUnit === 'days') multiplier *= 60 * 24;
      expiresAt = Date.now() + durationValue * multiplier;
    }

    const newPoll: Poll = {
      id: `poll-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      question: question.trim(),
      options: validOptions.map((optText, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        text: optText,
        votes: [],
      })),
      allowMultiple,
      closed: false,
      createdBy: currentUsername,
      expiresAt,
    };

    onCreatePoll(newPoll);
    // Reset state and close
    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    setDurationValue(24);
    setDurationUnit('hours');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
            isDarkMode
              ? 'bg-slate-900 border-white/10 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Modal Header */}
          <div
            className={`p-6 border-b flex items-center justify-between ${
              isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-vylant-blue/20 text-vylant-blue border border-vylant-blue/30">
                <BarChart2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">Create a Poll</h3>
                <p className="text-xs opacity-60 font-medium">
                  Ask a question and gather live votes in chat
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDarkMode ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Question Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
                Poll Question <span className="text-vylant-blue">*</span>
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What game should we play tonight?"
                className={`w-full px-4 py-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-vylant-blue/50 transition-all ${
                  isDarkMode
                    ? 'bg-black/30 border-white/10 text-white placeholder:text-white/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
                autoFocus
              />
            </div>

            {/* Options List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Options (min 2) <span className="text-vylant-blue">*</span>
                </label>
                <span className="text-[10px] font-mono opacity-50">
                  {options.length}/10 Options
                </span>
              </div>
              <div className="space-y-2.5">
                {options.map((optionText, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-mono text-xs font-bold opacity-40 shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={optionText}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className={`flex-1 px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-vylant-blue/50 transition-all ${
                        isDarkMode
                          ? 'bg-black/30 border-white/10 text-white placeholder:text-white/20'
                          : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                        title="Remove option"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className={`mt-3 w-full py-2.5 px-4 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    isDarkMode
                      ? 'border-white/20 text-vylant-blue hover:bg-vylant-blue/10 hover:border-vylant-blue/40'
                      : 'border-slate-300 text-vylant-blue hover:bg-vylant-blue/5 hover:border-vylant-blue/30'
                  }`}
                >
                  <Plus size={16} /> Add Option
                </button>
              )}
            </div>

            {/* Poll Settings */}
            <div
              className={`p-4 rounded-2xl border space-y-4 ${
                isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Allow Multiple Choice Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Allow Multiple Choices
                  </div>
                  <div className="text-[11px] opacity-60">
                    Voters can pick more than one option
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowMultiple(!allowMultiple)}
                  className={`p-1 transition-colors ${
                    allowMultiple ? 'text-vylant-blue' : 'opacity-40'
                  }`}
                >
                  {allowMultiple ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              {/* Poll Duration */}
              <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-vylant-blue" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">
                        Poll Duration
                      </div>
                      <div className="text-[11px] opacity-60">Auto-close poll after set time</div>
                    </div>
                  </div>
                  <select
                    value={durationUnit}
                    onChange={(e) => {
                      const unit = e.target.value as 'minutes' | 'hours' | 'days' | 'no-limit';
                      setDurationUnit(unit);
                      if (unit === 'minutes') setDurationValue(15);
                      else if (unit === 'hours') setDurationValue(24);
                      else if (unit === 'days') setDurationValue(3);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border focus:outline-none ${
                      isDarkMode
                        ? 'bg-slate-800 border-white/10 text-white'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="no-limit">No Limit</option>
                  </select>
                </div>

                {durationUnit !== 'no-limit' && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-xs opacity-60">Close after:</span>
                    <input
                      type="number"
                      min={1}
                      value={durationValue}
                      onChange={(e) => setDurationValue(Math.max(1, Number(e.target.value)))}
                      className={`w-20 px-3 py-1.5 text-xs font-bold rounded-xl border focus:outline-none focus:ring-1 focus:ring-vylant-blue/50 ${
                        isDarkMode
                          ? 'bg-black/30 border-white/10 text-white'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                    <span className="text-xs font-medium opacity-70">
                      {durationUnit}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
                  isDarkMode
                    ? 'hover:bg-white/10 text-white/60 hover:text-white'
                    : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                  isValid
                    ? 'bg-vylant-blue text-vylant-navy hover:scale-105 active:scale-95 shadow-vylant-blue/20 cursor-pointer'
                    : 'bg-white/10 text-white/30 cursor-not-allowed shadow-none'
                }`}
              >
                <Check size={16} /> Post Poll
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
