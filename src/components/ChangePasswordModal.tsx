import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  userName: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  userName
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('vylant_token') || sessionStorage.getItem('vylant_token');
      
      // Verify current password by attempting to log in
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userName, password: currentPassword })
      });

      if (!res.ok) {
        setError('Incorrect current password');
        return;
      }

      // Hash the new password
      const salt = bcrypt.genSaltSync(10);
      const hashedNewPassword = bcrypt.hashSync(newPassword, salt);

      // Update account
      const updateRes = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ username: userName, newPassword: hashedNewPassword })
      });

      if (!updateRes.ok) {
        setError('Failed to update password');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (e) {
      setError('An error occurred. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full max-w-md rounded-[2.5rem] shadow-2xl border overflow-hidden ${
          isDarkMode ? 'bg-[#0f0f0f] border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-xl shadow-cyan-600/20">
                <Lock size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Change Password</h2>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>Update your account security</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/5 text-white/20' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium text-center">
              Password updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Current Password</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-white/[0.03] border-white/10 focus:border-cyan-500 outline-none text-sm' : 'bg-slate-50 border-slate-200 focus:border-cyan-500 outline-none text-sm'
                }`}
              />
            </div>
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-white/[0.03] border-white/10 focus:border-cyan-500 outline-none text-sm' : 'bg-slate-50 border-slate-200 focus:border-cyan-500 outline-none text-sm'
                }`}
              />
            </div>
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-4 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-white/[0.03] border-white/10 focus:border-cyan-500 outline-none text-sm' : 'bg-slate-50 border-slate-200 focus:border-cyan-500 outline-none text-sm'
                }`}
              />
            </div>
            <button 
              type="submit"
              disabled={success}
              className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-bold text-xl shadow-xl shadow-cyan-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group mt-4 disabled:opacity-50 disabled:hover:scale-100"
            >
              {success ? 'Updated!' : 'Update Password'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ChangePasswordModal;
