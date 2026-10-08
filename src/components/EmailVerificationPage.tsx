import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
 Mail, 
 ArrowRight, 
 X,
 ShieldCheck,
 RefreshCw
} from 'lucide-react';

interface EmailVerificationPageProps {
 email: string;
 onVerify: (code: string) => void;
 onResend: () => void;
 onClose: () => void;
 isDarkMode: boolean;
 error?: string | null;
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ 
 email, 
 onVerify, 
 onResend, 
 onClose, 
 isDarkMode, 
 error 
}) => {
 const [code, setCode] = useState('');
 const [countdown, setCountdown] = useState(0);

 useEffect(() => {
 let timer: NodeJS.Timeout;
 if (countdown > 0) {
  timer = setTimeout(() => setCountdown(countdown - 1), 1000);
 }
 return () => clearTimeout(timer);
 }, [countdown]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 onVerify(code);
 };

 const handleResend = () => {
 if (countdown === 0) {
  onResend();
  setCountdown(60);
 }
 };

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
  <motion.div
  initial={{ opacity: 0, scale: 0.95, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 20 }}
  className={`relative w-full max-w-md rounded-[2.5rem] shadow-2xl border overflow-hidden p-8 md:p-10 ${
   isDarkMode ? 'bg-[#0f0f0f] border-white/5 text-white' : 'bg-white border-navy-200 text-navy-900'
  }`}
  >
  {/* Decorative elements eliminated for solid theme */}

  <button 
   onClick={onClose}
   className={`absolute top-6 right-6 p-2 rounded-xl transition-colors ${
   isDarkMode ? 'hover:bg-white/5 text-white/20 hover:text-white' : 'hover:bg-navy-100 text-navy-400 hover:text-navy-600'
   }`}
  >
   <X size={20} />
  </button>

  <div className="text-center mb-10">
   <div className="w-16 h-16 rounded-2xl bg-cyan-600 flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-cyan-600/20">
   <ShieldCheck size={32} />
   </div>
   <h2 className="text-3xl font-bold tracking-tight mb-2">Verify Email</h2>
   <p className={`text-sm font-medium ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>
   We sent a 6-digit code to <br/>
   <span className={isDarkMode ? 'text-white' : 'text-navy-900'}>{email}</span>
   </p>
   {error && (
   <motion.div 
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold"
   >
    {error}
   </motion.div>
   )}
  </div>

  <form onSubmit={handleSubmit} className="space-y-5">
   <div className="space-y-2">
   <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    Verification Code
   </label>
   <div className={`relative flex items-center rounded-2xl border transition-all duration-300 group ${
    isDarkMode 
    ? 'bg-white/[0.03] border-white/10 focus-within:border-cyan-500/50 focus-within:bg-white/5' 
    : 'bg-navy-50 border-navy-200 focus-within:border-cyan-500 focus-within:bg-white'
   }`}>
    <div className={`pl-4 text-white/20 group-focus-within:text-cyan-500 transition-colors`}>
    <Mail size={18} />
    </div>
    <input 
    type="text"
    value={code}
    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
    placeholder="123456"
    className="w-full bg-transparent border-none outline-none px-4 py-4 text-center tracking-[0.5em] text-xl font-black placeholder:text-white/5"
    required
    maxLength={6}
    />
   </div>
   </div>

   <button 
   type="submit"
   disabled={code.length !== 6}
   className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-cyan-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group mt-4 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
   >
   Verify Account
   <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
   </button>
  </form>

  <div className="mt-10 text-center">
   <p className={`text-sm font-medium ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>
   Didn't receive the code?{' '}
   <button 
    onClick={handleResend}
    disabled={countdown > 0}
    className={`font-bold flex items-center justify-center gap-1 mx-auto mt-2 transition-colors ${
    countdown > 0 
     ? (isDarkMode ? 'text-white/20 cursor-not-allowed' : 'text-navy-300 cursor-not-allowed')
     : 'text-cyan-400 hover:underline'
    }`}
   >
    <RefreshCw size={14} className={countdown > 0 ? '' : 'animate-spin-slow'} />
    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
   </button>
   </p>
  </div>
  </motion.div>
 </div>
 );
};

export default EmailVerificationPage;
