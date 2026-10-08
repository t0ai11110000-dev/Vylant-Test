import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
 User, 
 Lock, 
 ArrowRight, 
 X,
 Mail,
 ShieldCheck,
 AlertCircle,
 Calendar,
 Loader2
} from 'lucide-react';

interface SignUpPageProps {
 onSignUp: (username: string, password: string, emailOrPhone?: string, age?: number, birthDate?: string) => void;
 onLogin: (prefillUsername?: string) => void;
 onClose: () => void;
 isDarkMode: boolean;
 error?: string | null;
 isLoading?: boolean;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUp, onLogin, onClose, isDarkMode, error, isLoading = false }) => {
 const [username, setUsername] = useState('');
 const [emailOrPhone, setEmailOrPhone] = useState('');
 const [password, setPassword] = useState('');
 const [birthDate, setBirthDate] = useState('');
 const [localError, setLocalError] = useState<string | null>(null);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setLocalError(null);

 // Log attempt
 fetch('/api/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'signup_submit_click', username })
 }).catch(() => {});

 if (!birthDate) {
  setLocalError('Please enter your birth date.');
  return;
 }

 const today = new Date();
 const dob = new Date(birthDate);
 let age = today.getFullYear() - dob.getFullYear();
 const m = today.getMonth() - dob.getMonth();
 if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
  age--;
 }

 if (age < 13) {
  setLocalError('You must be at least 13 years old to use this app. Please re-enter your birth date if this is incorrect.');
  return;
 }

 onSignUp(username.trim(), password.trim(), emailOrPhone.trim(), age, birthDate);
 };

 const activeError = localError || error;
 const isAccountExistsError = activeError && (
 activeError.toLowerCase().includes('already exists') || 
 activeError.toLowerCase().includes('log in')
 );

 return (
 <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
   <h2 className="text-3xl font-bold tracking-tight mb-2">Create Account</h2>
   <p className={`text-sm font-medium ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>
   Join the next-gen communication hub
   </p>
   {activeError && (
   <motion.div 
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium text-left flex flex-col gap-2"
   >
    <div className="flex items-start gap-2">
    <AlertCircle size={16} className="shrink-0 mt-0.5" />
    <span>{activeError}</span>
    </div>
    {isAccountExistsError && (
    <button
     type="button"
     onClick={() => onLogin(username.trim())}
     className="mt-1 w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
    >
     Log in now {username.trim() ? `as "${username.trim()}"` : ''}
     <ArrowRight size={14} />
    </button>
    )}
   </motion.div>
   )}
  </div>

  <form onSubmit={handleSubmit} className="space-y-5">
   <div className="space-y-2">
   <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    Username
   </label>
   <div className={`relative flex items-center rounded-2xl border transition-all duration-300 group ${
    isDarkMode 
    ? 'bg-white/[0.03] border-white/10 focus-within:border-cyan-500/50 focus-within:bg-white/5' 
    : 'bg-navy-50 border-navy-200 focus-within:border-cyan-500 focus-within:bg-white'
   }`}>
    <div className={`pl-4 text-white/20 group-focus-within:text-cyan-500 transition-colors`}>
    <User size={18} />
    </div>
    <input 
    type="text"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    placeholder="vylant_user"
    className="w-full bg-transparent border-none outline-none px-4 py-4 text-sm font-medium placeholder:text-white/5"
    required
    />
   </div>
   </div>

   <div className="space-y-2">
   <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    Email (Optional)
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
    type="email"
    value={emailOrPhone}
    onChange={(e) => setEmailOrPhone(e.target.value)}
    placeholder="email@example.com"
    className="w-full bg-transparent border-none outline-none px-4 py-4 text-sm font-medium placeholder:text-white/5"
    />
   </div>
   </div>

   <div className="space-y-2">
   <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    Password
   </label>
   <div className={`relative flex items-center rounded-2xl border transition-all duration-300 group ${
    isDarkMode 
    ? 'bg-white/[0.03] border-white/10 focus-within:border-cyan-500/50 focus-within:bg-white/5' 
    : 'bg-navy-50 border-navy-200 focus-within:border-cyan-500 focus-within:bg-white'
   }`}>
    <div className={`pl-4 text-white/20 group-focus-within:text-cyan-500 transition-colors`}>
    <Lock size={18} />
    </div>
    <input 
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="••••••••"
    className="w-full bg-transparent border-none outline-none px-4 py-4 text-sm font-medium placeholder:text-white/5"
    required
    />
   </div>
   </div>

   <div className="space-y-2">
   <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    Birth Date
   </label>
   <div className={`relative flex items-center rounded-2xl border transition-all duration-300 group ${
    isDarkMode 
    ? 'bg-white/[0.03] border-white/10 focus-within:border-cyan-500/50 focus-within:bg-white/5' 
    : 'bg-navy-50 border-navy-200 focus-within:border-cyan-500 focus-within:bg-white'
   }`}>
    <div className={`pl-4 text-white/20 group-focus-within:text-cyan-500 transition-colors`}>
    <Calendar size={18} />
    </div>
    <input 
    type="date"
    value={birthDate}
    onChange={(e) => setBirthDate(e.target.value)}
    className={`w-full bg-transparent border-none outline-none px-4 py-4 text-sm font-medium ${
     isDarkMode ? '[color-scheme:dark]' : ''
    }`}
    required
    />
   </div>
   </div>

   <button 
   type="submit"
   disabled={isLoading}
   className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-cyan-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
   >
   {isLoading ? (
    <>
    <Loader2 size={20} className="animate-spin" />
    Signing Up...
    </>
   ) : (
    <>
    Sign Up
    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
    </>
   )}
   </button>
  </form>

  <div className="mt-10 text-center">
   <p className={`text-sm font-medium ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>
   Already have an account?{' '}
   <button 
    type="button"
    onClick={() => onLogin(username.trim())}
    className="text-cyan-400 font-bold hover:underline"
   >
    Log in instead
   </button>
   </p>
  </div>
  </motion.div>
 </div>
 );
};

export default SignUpPage;
