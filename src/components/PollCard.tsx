import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart2, Check, Lock, Users, Clock } from 'lucide-react';

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  allowMultiple?: boolean;
  closed?: boolean;
  createdBy?: string;
  expiresAt?: number;
}

interface PollCardProps {
  poll: Poll;
  messageId: string;
  currentUsername: string;
  isDarkMode: boolean;
  vylantUsers?: Array<{ name: string; image?: string }>;
  onVote: (optionId: string) => void;
  onClosePoll?: () => void;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  messageId,
  currentUsername,
  isDarkMode,
  vylantUsers = [],
  onVote,
  onClosePoll,
}) => {
  const [activeVoterPopoverOptionId, setActiveVoterPopoverOptionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isCurrentlyExpired, setIsCurrentlyExpired] = useState(false);

  React.useEffect(() => {
    if (!poll.expiresAt || poll.closed) {
      setTimeLeft('');
      setIsCurrentlyExpired(!!poll.closed);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const difference = poll.expiresAt! - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsCurrentlyExpired(true);
        return true;
      }

      setIsCurrentlyExpired(false);

      const seconds = Math.floor((difference / 1000) % 60);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
      return false;
    };

    const expired = updateTimer();
    if (expired) return;

    const interval = setInterval(() => {
      const expired = updateTimer();
      if (expired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [poll.expiresAt, poll.closed]);

  const isExpired = !!(poll.expiresAt && Date.now() > poll.expiresAt) || isCurrentlyExpired;
  const isClosed = poll.closed || isExpired;

  // Calculate total votes
  const allVotersSet = new Set<string>();
  poll.options.forEach((opt) => {
    (opt.votes || []).forEach((v) => allVotersSet.add(v));
  });
  const totalUniqueVoters = allVotersSet.size;

  const totalOptionVotes = poll.options.reduce(
    (acc, opt) => acc + (opt.votes?.length || 0),
    0
  );

  // Check if current user has voted on any option
  const userHasVoted = poll.options.some((opt) =>
    (opt.votes || []).includes(currentUsername)
  );

  const isCreator = poll.createdBy === currentUsername;

  const getUserAvatar = (username: string) => {
    const userObj = vylantUsers.find((u) => u.name === username);
    if (userObj?.image) return userObj.image;
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
  };

  return (
    <div
      className={`my-2 p-4 rounded-2xl border transition-all duration-300 w-full max-w-md ${
        isDarkMode
          ? 'bg-black/30 border-white/10 shadow-xl'
          : 'bg-white border-slate-200 shadow-md'
      }`}
    >
      {/* Poll Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
              isDarkMode
                ? 'bg-vylant-blue/20 text-vylant-blue border border-vylant-blue/30'
                : 'bg-vylant-blue/10 text-vylant-blue border border-vylant-blue/20'
            }`}
          >
            <BarChart2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isDarkMode ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Poll
              </span>
              <span className="text-[10px] font-mono text-vylant-blue opacity-80 uppercase tracking-widest">
                {poll.allowMultiple ? 'Multiple Choice' : 'Single Choice'}
              </span>
              {poll.expiresAt && !isClosed && timeLeft && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <Clock size={10} className="animate-pulse" /> {timeLeft}
                </span>
              )}
              {isClosed && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Lock size={10} /> Closed
                </span>
              )}
            </div>
            <h4
              className={`font-bold text-sm leading-snug break-words ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {poll.question}
            </h4>
          </div>
        </div>
      </div>

      {/* Options List */}
      <div className="flex flex-col gap-2.5 my-3">
        {poll.options.map((option) => {
          const votes = option.votes || [];
          const voteCount = votes.length;
          const percentage =
            totalOptionVotes > 0 ? Math.round((voteCount / totalOptionVotes) * 100) : 0;
          const userVoted = votes.includes(currentUsername);

          return (
            <div key={option.id} className="relative group">
              <button
                type="button"
                disabled={isClosed}
                onClick={() => !isClosed && onVote(option.id)}
                className={`w-full relative overflow-hidden rounded-xl p-3 text-left transition-all duration-300 border flex items-center justify-between gap-3 ${
                  isClosed
                    ? 'cursor-default'
                    : 'cursor-pointer hover:border-vylant-blue/60 active:scale-[0.99]'
                } ${
                  userVoted
                    ? isDarkMode
                      ? 'border-vylant-blue bg-vylant-blue/10 text-white shadow-[0_0_15px_rgba(0,210,255,0.15)]'
                      : 'border-vylant-blue bg-vylant-blue/5 text-slate-900 shadow-sm'
                    : isDarkMode
                    ? 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                }`}
              >
                {/* Background Progress Bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`absolute inset-y-0 left-0 pointer-events-none ${
                    userVoted
                      ? isDarkMode
                        ? 'bg-vylant-blue/25'
                        : 'bg-vylant-blue/20'
                      : isDarkMode
                      ? 'bg-white/10'
                      : 'bg-slate-200/70'
                  }`}
                />

                {/* Option Content Left */}
                <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                      userVoted
                        ? 'bg-vylant-blue border-vylant-blue text-vylant-navy font-bold shadow-md'
                        : isDarkMode
                        ? 'border-white/20 bg-black/20 text-transparent'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="font-medium text-sm truncate">{option.text}</span>
                </div>

                {/* Option Content Right: Stats & Voter Avatars */}
                <div className="relative z-10 flex items-center gap-2 shrink-0">
                  {/* Voters Avatar Preview */}
                  {votes.length > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVoterPopoverOptionId(
                          activeVoterPopoverOptionId === option.id ? null : option.id
                        );
                      }}
                      className="flex -space-x-1.5 items-center cursor-pointer hover:scale-105 transition-transform"
                      title="Click to view voters"
                    >
                      {votes.slice(0, 3).map((voter, idx) => (
                        <img
                          key={idx}
                          src={getUserAvatar(voter)}
                          alt={voter}
                          className="w-5 h-5 rounded-full object-cover border border-white/20 bg-slate-800"
                        />
                      ))}
                      {votes.length > 3 && (
                        <span className="w-5 h-5 rounded-full bg-vylant-blue/30 text-vylant-blue text-[9px] font-mono font-bold flex items-center justify-center border border-white/20">
                          +{votes.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <span className="text-xs font-mono font-bold opacity-80">
                    {percentage}%
                  </span>
                </div>
              </button>

              {/* Voter Names Popover */}
              <AnimatePresence>
                {activeVoterPopoverOptionId === option.id && votes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className={`absolute right-0 top-full mt-1 z-30 p-3 rounded-xl border shadow-xl max-w-xs w-48 ${
                      isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-vylant-blue mb-1.5">
                      Voted for "{option.text}":
                    </div>
                    <div className="max-h-28 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {votes.map((voter) => (
                        <div key={voter} className="flex items-center gap-2 text-xs">
                          <img
                            src={getUserAvatar(voter)}
                            alt={voter}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="font-medium truncate">{voter}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Poll Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-white/50 font-medium">
          <Users size={12} className="text-vylant-blue" />
          <span>
            {totalUniqueVoters} {totalUniqueVoters === 1 ? 'vote' : 'votes'}
          </span>
          {poll.expiresAt && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {isClosed ? 'Expired' : timeLeft ? `${timeLeft} left` : 'Active'}
              </span>
            </>
          )}
        </div>

        {/* Creator Close Poll Option */}
        {isCreator && !isClosed && onClosePoll && (
          <button
            type="button"
            onClick={onClosePoll}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all flex items-center gap-1"
          >
            <Lock size={12} /> End Poll
          </button>
        )}
      </div>
    </div>
  );
};
