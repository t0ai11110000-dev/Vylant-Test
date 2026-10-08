import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 Shield, 
 ShieldCheck, 
 ShieldAlert, 
 AlertTriangle, 
 ExternalLink, 
 Copy, 
 Check, 
 Lock, 
 Unlock, 
 Globe, 
 CheckCircle2, 
 X, 
 Sparkles
} from 'lucide-react';
import { 
 analyzeSafeLink, 
 SafeLinkAnalysis, 
 addTrustedDomain, 
 isDomainTrusted
} from '../utils/safeLink';

interface SafeLinkModalProps {
 isOpen: boolean;
 onClose: () => void;
 url: string | null;
 isDarkMode: boolean;
}

export const SafeLinkModal: React.FC<SafeLinkModalProps> = ({
 isOpen,
 onClose,
 url,
 isDarkMode
}) => {
 const [copied, setCopied] = useState(false);
 const [analysis, setAnalysis] = useState<SafeLinkAnalysis | null>(null);
 const [isTrustingDomain, setIsTrustingDomain] = useState(false);
 const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState(false);
 const [serverScanResult, setServerScanResult] = useState<{ scanned: boolean; secure: boolean; message?: string } | null>(null);

 useEffect(() => {
  if (url && isOpen) {
   const localAnalysis = analyzeSafeLink(url);
   setAnalysis(localAnalysis);
   setCopied(false);
   setHasAcknowledgedRisk(false);
   setIsTrustingDomain(isDomainTrusted(localAnalysis.hostname));

   // Attempt server-side scan
   fetch('/api/safelink/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
   })
    .then(res => res.json())
    .then(data => {
     if (data && !data.error) {
      setServerScanResult({
       scanned: true,
       secure: data.safe ?? true,
       message: data.message
      });
     }
    })
    .catch(() => {
     // Graceful fallback to local analysis
     setServerScanResult(null);
    });
  } else {
   setAnalysis(null);
   setServerScanResult(null);
  }
 }, [url, isOpen]);

 if (!isOpen || !url || !analysis) return null;

 const isDangerous = analysis.status === 'dangerous' || (serverScanResult && !serverScanResult.secure);
 const isSuspicious = analysis.status === 'suspicious';
 const isVerified = analysis.status === 'verified' || analysis.status === 'safe';

 const handleCopyLink = () => {
  navigator.clipboard.writeText(analysis.cleanUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
 };

 const handleTrustDomain = () => {
  if (analysis.hostname && analysis.hostname !== 'invalid-url') {
   addTrustedDomain(analysis.hostname);
   setIsTrustingDomain(true);
  }
 };

 const handleProceed = () => {
  if (isDangerous && !hasAcknowledgedRisk) return;
  window.open(analysis.cleanUrl, '_blank', 'noopener,noreferrer');
  onClose();
 };

 return (
  <AnimatePresence>
   <div 
    className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    onClick={onClose}
   >
    <motion.div
     initial={{ opacity: 0, scale: 0.95, y: 15 }}
     animate={{ opacity: 1, scale: 1, y: 0 }}
     exit={{ opacity: 0, scale: 0.95, y: 15 }}
     transition={{ type: 'spring', damping: 25, stiffness: 350 }}
     onClick={(e) => e.stopPropagation()}
     className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
      isDarkMode 
       ? 'bg-[#121318] border-white/10 text-white' 
       : 'bg-white border-navy-200 text-navy-900 shadow-slate-900/10'
     }`}
    >
     {/* Header Banner */}
     <div className={`p-6 border-b flex items-start justify-between gap-4 relative overflow-hidden ${
      isDangerous
       ? 'bg-rose-500/10 border-rose-500/20'
       : isSuspicious
       ? 'bg-amber-500/10 border-amber-500/20'
       : 'bg-vylant-blue/10 border-vylant-blue/20'
     }`}>
      <div className="flex items-center gap-3.5 z-10">
       <div className={`p-3 rounded-2xl border shadow-sm ${
        isDangerous
         ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
         : isSuspicious
         ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
         : 'bg-vylant-blue/20 border-vylant-blue/40 text-vylant-blue'
       }`}>
        {isDangerous ? (
         <ShieldAlert size={28} className="animate-pulse" />
        ) : isSuspicious ? (
         <AlertTriangle size={28} />
        ) : (
         <ShieldCheck size={28} />
        )}
       </div>
       <div>
        <div className="flex items-center gap-2">
         <h3 className="text-lg font-black tracking-tight">
          {isDangerous 
           ? 'Security Warning: Dangerous Link' 
           : isSuspicious 
           ? 'Caution: Unverified Link' 
           : 'Vylant SafeLink Shield'}
         </h3>
         <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
          isDangerous
           ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
           : isSuspicious
           ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
           : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
         }`}>
          {analysis.safetyScore}% Safe
         </span>
        </div>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/60' : 'text-navy-500'}`}>
         {isDangerous
          ? 'This link may attempt to steal passwords, distribute malware, or trick you.'
          : isSuspicious
          ? 'Please review the destination carefully before continuing.'
          : 'This link has been analyzed and sanitized by Vylant Link Shield.'}
        </p>
       </div>
      </div>

      <button
       onClick={onClose}
       className={`p-2 rounded-xl transition-colors shrink-0 z-10 ${
        isDarkMode ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-navy-100 text-navy-400 hover:text-navy-700'
       }`}
      >
       <X size={20} />
      </button>
     </div>

     {/* Body Content */}
     <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
      
      {/* Sanitized URL Card */}
      <div className={`p-4 rounded-2xl border flex flex-col gap-2.5 ${
       isDarkMode ? 'bg-black/30 border-white/10' : 'bg-navy-50 border-navy-200'
      }`}>
       <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
         isDarkMode ? 'text-white/50' : 'text-navy-500'
        }`}>
         <Globe size={13} /> Destination Hostname
        </span>
        <span className="text-xs font-mono font-bold text-vylant-blue">
         {analysis.hostname}
        </span>
       </div>

       <div className={`p-3 rounded-xl border font-mono text-xs break-all select-all ${
        isDarkMode ? 'bg-black/40 border-white/5 text-white/90' : 'bg-white border-navy-200 text-navy-800'
       }`}>
        {analysis.cleanUrl}
       </div>

       <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs">
         {analysis.protocol === 'https:' ? (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
           <Lock size={12} /> HTTPS Encrypted
          </span>
         ) : (
          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
           <Unlock size={12} /> Unencrypted HTTP
          </span>
         )}
        </div>

        <button
         type="button"
         onClick={handleCopyLink}
         className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
          copied 
           ? 'bg-emerald-500 text-white' 
           : isDarkMode 
           ? 'bg-white/10 hover:bg-white/15 text-white' 
           : 'bg-navy-200 hover:bg-navy-300 text-navy-800'
         }`}
        >
         {copied ? <Check size={13} /> : <Copy size={13} />}
         <span>{copied ? 'Copied Clean Link' : 'Copy Clean Link'}</span>
        </button>
       </div>
      </div>

      {/* Privacy Sanitizer Stripped Notice */}
      {analysis.strippedParamCount > 0 && (
       <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
        isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800'
       }`}>
        <div className="flex items-center gap-2.5 min-w-0">
         <Sparkles size={16} className="text-cyan-400 shrink-0" />
         <div className="truncate">
          <span className="font-bold">Privacy Sanitizer Active: </span>
          <span className="opacity-80">
           Stripped {analysis.strippedParamCount} tracking parameter{analysis.strippedParamCount > 1 ? 's' : ''} ({analysis.strippedParams.slice(0, 3).join(', ')}{analysis.strippedParamCount > 3 ? '...' : ''}).
          </span>
         </div>
        </div>
       </div>
      )}

      {/* Threats / Warnings Breakdown */}
      {(analysis.threats.length > 0 || analysis.warnings.length > 0) && (
       <div className="space-y-2.5">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${
         isDarkMode ? 'text-white/50' : 'text-navy-500'
        }`}>
         Security Scan Diagnostics
        </span>

        {analysis.threats.map((threat, i) => (
         <div key={`threat-${i}`} className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs font-medium ${
          isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
         }`}>
          <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <span>{threat}</span>
         </div>
        ))}

        {analysis.warnings.map((warn, i) => (
         <div key={`warn-${i}`} className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs font-medium ${
          isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
         }`}>
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <span>{warn}</span>
         </div>
        ))}
       </div>
      )}

      {/* Trust Domain Option */}
      {!isTrustingDomain && !isDangerous && (
       <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
        isDarkMode ? 'bg-white/5 border-white/10' : 'bg-navy-100 border-navy-200'
       }`}>
        <div className="flex items-center gap-2">
         <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
         <span>Trust links from <strong>{analysis.hostname}</strong> in the future?</span>
        </div>
        <button
         type="button"
         onClick={handleTrustDomain}
         className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shrink-0 transition-all"
        >
         Trust Domain
        </button>
       </div>
      )}

      {/* Dangerous Link Explicit Confirmation */}
      {isDangerous && (
       <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 cursor-pointer text-xs select-none">
        <input
         type="checkbox"
         checked={hasAcknowledgedRisk}
         onChange={(e) => setHasAcknowledgedRisk(e.target.checked)}
         className="mt-0.5 w-4 h-4 rounded border-rose-500/40 text-rose-500 focus:ring-rose-500/40 bg-transparent"
        />
        <span className="text-rose-400 font-medium">
         I understand the risks of visiting this potentially harmful website and wish to proceed anyway.
        </span>
       </label>
      )}

     </div>

     {/* Footer Actions */}
     <div className={`p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
      isDarkMode ? 'bg-black/20 border-white/10' : 'bg-navy-50 border-navy-200'
     }`}>
      <button
       type="button"
       onClick={onClose}
       className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
        isDarkMode 
         ? 'border-white/10 hover:bg-white/10 text-white/80' 
         : 'border-navy-200 hover:bg-navy-200 text-navy-700'
       }`}
      >
       Stay in Chat
      </button>

      <div className="flex items-center gap-2 w-full sm:w-auto">
       <button
        type="button"
        onClick={handleProceed}
        disabled={isDangerous && !hasAcknowledgedRisk}
        className={`w-full sm:w-auto px-6 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
         isDangerous
          ? hasAcknowledgedRisk
           ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
           : 'bg-rose-500/30 text-rose-200/40 cursor-not-allowed border border-rose-500/20'
          : isSuspicious
          ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
          : 'bg-vylant-blue hover:bg-cyan-400 text-slate-950 shadow-vylant-blue/20'
        }`}
       >
        <span>Continue to Link</span>
        <ExternalLink size={14} />
       </button>
      </div>
     </div>
    </motion.div>
   </div>
  </AnimatePresence>
 );
};
