import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
 User, 
 Lock, 
 ArrowRight, 
 X,
 Mail,
 Phone,
 ShieldCheck,
 Loader2
} from 'lucide-react';

interface LoginPageProps {
 onLogin: (identifier: string, password: string, rememberMe: boolean) => void;
 onSignUp: () => void;
 onClose: () => void;
 isDarkMode: boolean;
 error?: string | null;
 isLoading?: boolean;
 initialIdentifier?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSignUp, onClose, isDarkMode, error: externalError, isLoading = false, initialIdentifier = '' }) => {
 const [view, setView] = useState<'login' | 'forgot-identify' | 'forgot-verify' | 'forgot-reset'>('login');
 const [identifier, setIdentifier] = useState(initialIdentifier);
 const [password, setPassword] = useState('');
 const [rememberMe, setRememberMe] = useState(false);
 const [forgotEmail, setForgotEmail] = useState('');
 const [verificationCode, setVerificationCode] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [recoveryToken, setRecoveryToken] = useState('');
 const [loading, setLoading] = useState(false);
 const [localError, setLocalError] = useState<string | null>(null);
 const [successMessage, setSuccessMessage] = useState<string | null>(null);

 const error = localError || externalError;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 onLogin(identifier.trim(), password.trim(), rememberMe);
 };

 const handleSendCode = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setLocalError(null);
 try {
  const response = await fetch('/api/forgot-password/send-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: forgotEmail })
  });
  const data = await response.json();
  if (response.ok) {
  setView('forgot-verify');
  } else {
  setLocalError(data.error || 'Failed to send code');
  }
 } catch (err) {
  setLocalError('Connection error. Please try again.');
 } finally {
  setLoading(false);
 }
 };

 const handleVerifyCode = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setLocalError(null);
 try {
  const response = await fetch('/api/forgot-password/verify-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: forgotEmail, code: verificationCode })
  });
  const data = await response.json();
  if (response.ok) {
  setRecoveryToken(data.recoveryToken);
  setView('forgot-reset');
  } else {
  setLocalError(data.error || 'Invalid verification code');
  }
 } catch (err) {
  setLocalError('Connection error. Please try again.');
 } finally {
  setLoading(false);
 }
 };

 const handleForgotReset = async (e: React.FormEvent) => {
 e.preventDefault();
 if (newPassword !== confirmPassword) {
  setLocalError('Passwords do not match');
  return;
 }
 if (newPassword.length < 6) {
  setLocalError('Password must be at least 6 characters');
  return;
 }

 setLoading(true);
 setLocalError(null);
 try {
  const response = await fetch('/api/forgot-password/reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ recoveryToken, newPassword })
  });
  const data = await response.json();
  if (response.ok) {
  setSuccessMessage('Password reset successfully! You can now login.');
  setView('login');
  setForgotEmail('');
  setNewPassword('');
  setConfirmPassword('');
  } else {
  setLocalError(data.error || 'Failed to reset password');
  }
 } catch (err) {
  setLocalError('Connection error. Please try again.');
 } finally {
  setLoading(false);
 }
 };

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

  <div className="text-center mb-8">
   <div className="w-16 h-16 rounded-2xl bg-cyan-600 flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-cyan-600/20">
   <ShieldCheck size={32} />
   </div>
   <h2 className="text-3xl font-bold tracking-tight mb-2">
   {view === 'login' ? 'Welcome Back' : view === 'forgot-identify' ? 'Reset Password' : view === 'forgot-verify' ? 'Verify Identity' : 'New Password'}
   </h2>
   <p className={`text-sm font-medium ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>
   {view === 'login' 
    ? 'Enter your credentials to access Vylant' 
    : view === 'forgot-identify' 
    ? 'Enter your account details to recover your password' 
    : view === 'forgot-verify'
     ? 'Enter the 6-digit code sent to your email'
     : 'Enter your new secure password'}
   </p>
   {(error || successMessage) && (
   <motion.div 
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`mt-4 p-3 rounded-xl border text-xs font-bold ${
    successMessage 
     ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
     : 'bg-red-500/10 border-red-500/20 text-red-500'
    }`}
   >
    {successMessage || error}
   </motion.div>
   )}
  </div>

  {view === 'login' && (
   <form onSubmit={handleSubmit} className="space-y-5">
   <div className="space-y-2">
    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    Username, Email, or Phone
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
     value={identifier}
     onChange={(e) => setIdentifier(e.target.value)}
     placeholder="vylant_user"
     className="w-full bg-transparent border-none outline-none px-4 py-4 text-sm font-medium placeholder:text-white/5"
     required
    />
    </div>
   </div>

   <div className="space-y-2">
    <div className="flex justify-between items-center ml-1">
    <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
     Password
    </label>
    <button 
     type="button" 
     onClick={() => {
     setView('forgot-identify');
     setLocalError(null);
     setSuccessMessage(null);
     }}
     className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors"
    >
     Forgot?
    </button>
    </div>
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

   <div className="flex items-center gap-2 ml-1">
    <input
    type="checkbox"
    id="rememberMe"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
    className="w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
    />
    <label htmlFor="rememberMe" className={`text-xs font-medium ${isDarkMode ? 'text-white/60' : 'text-navy-600'}`}>
    Remember me
    </label>
   </div>

   <button 
    type="submit"
    disabled={isLoading}
    className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-cyan-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
   >
    {isLoading ? (
    <>
     <Loader2 size={20} className="animate-spin" />
     Logging in...
    </>
    ) : (
    <>
     Login
     <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
    </>
    )}
   </button>
   </form>
  )}

  {view === 'forgot-identify' && (
   <form onSubmit={handleSendCode} className="space-y-5">
   <div className="bg-cyan-500/5 border border-cyan-500/10 p-3 rounded-xl mb-4">
    <p className={`text-[10px] font-bold leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-navy-600'}`}>
    <span className="text-cyan-400">Note:</span> Resetting your password will only work if you have a valid email address linked to your account.
    </p>
   </div>

   <div className="space-y-2">
    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    Email Address
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
     value={forgotEmail}
     onChange={(e) => setForgotEmail(e.target.value)}
     placeholder="user@example.com"
     className="w-full bg-transparent border-none outline-none px-4 py-4 text-sm font-medium placeholder:text-white/5"
     required
    />
    </div>
   </div>

   <div className="flex flex-col gap-3 mt-4">
    <button 
    type="submit"
    disabled={loading}
    className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-cyan-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
    >
    {loading ? (
     <>
     <Loader2 size={20} className="animate-spin" />
     Sending Code...
     </>
    ) : (
     <>
     Send Code
     <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
     </>
    )}
    </button>
    <button 
    type="button"
    onClick={() => setView('login')}
    className={`text-xs font-bold uppercase tracking-widest p-2 ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-navy-400 hover:text-navy-600'}`}
    >
    Back to Login
    </button>
   </div>
   </form>
  )}

  {view === 'forgot-verify' && (
   <form onSubmit={handleVerifyCode} className="space-y-5">
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
     <ShieldCheck size={18} />
    </div>
    <input 
     type="text"
     maxLength={6}
     value={verificationCode}
     onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
     placeholder="123456"
     className="w-full bg-transparent border-none outline-none px-4 py-4 text-lg font-black tracking-[0.5em] text-center placeholder:text-white/10 placeholder:tracking-normal"
     required
    />
    </div>
   </div>

   <div className="flex flex-col gap-3 mt-4">
    <button 
    type="submit"
    disabled={loading}
    className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-cyan-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
    >
    {loading ? (
     <>
     <Loader2 size={20} className="animate-spin" />
     Verifying...
     </>
    ) : (
     <>
     Verify Code
     <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
     </>
    )}
    </button>
    <button 
    type="button"
    onClick={() => setView('forgot-identify')}
    className={`text-xs font-bold uppercase tracking-widest p-2 ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-navy-400 hover:text-navy-600'}`}
    >
    Change Email
    </button>
   </div>
   </form>
  )}

  {view === 'forgot-reset' && (
   <form onSubmit={handleForgotReset} className="space-y-5">
   <div className="space-y-2">
    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    New Password
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
     value={newPassword}
     onChange={(e) => setNewPassword(e.target.value)}
     placeholder="••••••••"
     className="w-full bg-transparent border-none outline-none px-4 py-4 text-sm font-medium placeholder:text-white/5"
     required
    />
    </div>
   </div>

   <div className="space-y-2">
    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
    Confirm Password
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
     value={confirmPassword}
     onChange={(e) => setConfirmPassword(e.target.value)}
     placeholder="••••••••"
     className="w-full bg-transparent border-none outline-none px-4 py-4 text-sm font-medium placeholder:text-white/5"
     required
    />
    </div>
   </div>

   <div className="flex flex-col gap-3 mt-4">
    <button 
    type="submit"
    disabled={loading}
    className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-cyan-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
    >
    {loading ? (
     <>
     <Loader2 size={20} className="animate-spin" />
     Resetting...
     </>
    ) : (
     <>
     Reset Password
     <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
     </>
    )}
    </button>
    <button 
    type="button"
    onClick={() => setView('forgot-identify')}
    className={`text-xs font-bold uppercase tracking-widest p-2 ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-navy-400 hover:text-navy-600'}`}
    >
    Back
    </button>
   </div>
   </form>
  )}

  <div className="mt-10 text-center">
   <p className={`text-sm font-medium ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>
   Don't have an account?{' '}
   <button 
    onClick={onSignUp}
    className="text-cyan-400 font-bold hover:underline"
   >
    Create an account
   </button>
   </p>
  </div>
  </motion.div>
 </div>
 );
};

export default LoginPage;
