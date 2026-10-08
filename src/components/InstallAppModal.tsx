import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
 X,
 Download,
 Terminal,
 Smartphone,
 Laptop,
 Apple,
 Bot,
 QrCode,
 Copy,
 Check,
 ExternalLink,
 ChevronRight,
 ShieldCheck
} from 'lucide-react';
import {
 PLATFORMS,
 detectUserPlatform,
 triggerFileDownload,
 generateMacInstallerScript,
 generateMacWebloc,
 generateIOSMobileConfig,
 generateLinuxInstallerScript,
 generateLinuxDesktopEntry,
 generateAndroidHelperHtml,
 generateWindowsBat,
 generateWindowsUrlShortcut
} from '../utils/downloadHelpers';

interface InstallAppModalProps {
 isOpen: boolean;
 onClose: () => void;
 isDarkMode: boolean;
 hasInstallPrompt?: boolean;
 onTriggerPrompt?: () => Promise<void> | void;
 onMarkInstalled: () => void;
 initialPlatform?: 'mac' | 'ios' | 'android' | 'linux' | 'windows' | null;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
 isOpen,
 onClose,
 isDarkMode,
 hasInstallPrompt = false,
 onTriggerPrompt,
 onMarkInstalled,
 initialPlatform = null
}) => {
 const [selectedPlatform, setSelectedPlatform] = useState<'mac' | 'ios' | 'android' | 'linux' | 'windows'>('mac');
 const [detectedPlatform, setDetectedPlatform] = useState<'mac' | 'ios' | 'android' | 'linux' | 'windows'>('mac');
 const [qrDataUrl, setQrDataUrl] = useState<string>('');
 const [copiedKey, setCopiedKey] = useState<string | null>(null);
 const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

 // Detect platform on mount or when modal opens
 useEffect(() => {
 if (isOpen) {
  const autoSys = detectUserPlatform();
  setDetectedPlatform(autoSys);
  setSelectedPlatform(initialPlatform || autoSys);
 }
 }, [isOpen, initialPlatform]);

 // Generate QR Code for Mobile Scanning
 useEffect(() => {
 if (!isOpen) return;
 const url = typeof window !== 'undefined' ? (window.location.origin || window.location.href) : 'https://vylant.net';
 QRCode.toDataURL(url, {
  width: 240,
  margin: 1.5,
  color: {
  dark: '#030712',
  light: '#ffffff'
  }
 })
  .then((dataUri) => setQrDataUrl(dataUri))
  .catch((err) => console.error('QR code generation error:', err));
 }, [isOpen]);

 if (!isOpen) return null;

 const currentUrl = typeof window !== 'undefined' ? (window.location.origin || window.location.href) : 'https://vylant.net';

 const copyToClipboard = async (text: string, key: string) => {
 try {
  await navigator.clipboard.writeText(text);
  setCopiedKey(key);
  setTimeout(() => setCopiedKey(null), 2500);
 } catch (e) {
  console.warn('Copy failed:', e);
 }
 };

 const showDownloadNotice = (msg: string) => {
 setDownloadFeedback(msg);
 setTimeout(() => setDownloadFeedback(null), 3500);
 };

 // Platform-specific download triggers
 const handleDownloadMac = () => {
 triggerFileDownload(generateMacInstallerScript(currentUrl), 'Vylant-macOS-Installer.command', 'application/x-sh');
 showDownloadNotice('Downloaded Vylant-macOS-Installer.command');
 onMarkInstalled();
 };

 const handleDownloadMacWebloc = () => {
 triggerFileDownload(generateMacWebloc(currentUrl), 'Vylant.webloc', 'application/octet-stream');
 showDownloadNotice('Downloaded Vylant.webloc');
 };

 const handleDownloadIOS = () => {
 triggerFileDownload(generateIOSMobileConfig(currentUrl), 'Vylant.mobileconfig', 'application/x-apple-aspen-config');
 showDownloadNotice('Downloaded Vylant.mobileconfig profile');
 onMarkInstalled();
 };

 const handleDownloadAndroidHelper = () => {
 triggerFileDownload(generateAndroidHelperHtml(currentUrl), 'Vylant-Android-Install.html', 'text/html');
 showDownloadNotice('Downloaded Vylant-Android-Install.html');
 onMarkInstalled();
 };

 const handleDownloadLinuxInstaller = () => {
 triggerFileDownload(generateLinuxInstallerScript(currentUrl), 'vylant-linux-installer.sh', 'application/x-sh');
 showDownloadNotice('Downloaded vylant-linux-installer.sh');
 onMarkInstalled();
 };

 const handleDownloadLinuxDesktop = () => {
 triggerFileDownload(generateLinuxDesktopEntry(currentUrl), 'vylant.desktop', 'application/x-desktop');
 showDownloadNotice('Downloaded vylant.desktop');
 onMarkInstalled();
 };

 const handleDownloadWindows = () => {
 triggerFileDownload(generateWindowsBat(currentUrl), 'Vylant.bat', 'application/x-bat');
 showDownloadNotice('Downloaded Vylant.bat');
 onMarkInstalled();
 };

 const handleDownloadWindowsUrl = () => {
 triggerFileDownload(generateWindowsUrlShortcut(currentUrl), 'Vylant.url', 'application/octet-stream');
 showDownloadNotice('Downloaded Vylant.url');
 };

 const handleNativePrompt = async () => {
 if (onTriggerPrompt) {
  try {
  await onTriggerPrompt();
  onMarkInstalled();
  } catch (err) {
  console.error('Native install error:', err);
  }
 }
 };

 const linuxTerminalCommand = `curl -sSL "${currentUrl}/api/download/linux" | bash`;

 return (
 <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
  <div
  className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden ${
   isDarkMode
   ? 'bg-[#090b10] border-white/10 text-white shadow-black/90'
   : 'bg-white border-navy-200 text-navy-900 shadow-slate-300'
  }`}
  >
  {/* Header Bar */}
  <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-navy-100 bg-navy-50/50'}`}>
   <div className="flex items-center gap-3">
   <div className="w-9 h-9 rounded-lg overflow-hidden border border-vylant-blue/40 p-0.5 bg-[#030712] shrink-0">
    <img
    src="https://i.imgur.com/H3OS5zA.png"
    alt="Vylant"
    className="w-full h-full object-cover rounded-[5px]"
    referrerPolicy="no-referrer"
    />
   </div>
   <div>
    <h2 className="text-base font-bold tracking-tight">Download Vylant</h2>
   </div>
   </div>

   <button
   onClick={onClose}
   aria-label="Close modal"
   className={`p-1.5 rounded-lg transition-colors ${
    isDarkMode
    ? 'hover:bg-white/10 text-white/50 hover:text-white'
    : 'hover:bg-navy-100 text-navy-400 hover:text-navy-700'
   }`}
   >
   <X size={18} />
   </button>
  </div>

  {/* Platform Switcher Tabs */}
  <div className={`px-6 pt-4 pb-2 border-b ${isDarkMode ? 'border-white/5 bg-[#07080d]' : 'border-navy-100 bg-navy-50/30'}`}>
   <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-black/40 border border-white/5">
   {PLATFORMS.map((p) => {
    const isSelected = selectedPlatform === p.id;
    const isDetected = detectedPlatform === p.id;
    return (
    <button
     key={p.id}
     onClick={() => setSelectedPlatform(p.id)}
     className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
     isSelected
      ? 'bg-vylant-blue text-black font-bold shadow-sm'
      : isDarkMode
      ? 'text-white/60 hover:text-white hover:bg-white/5'
      : 'text-navy-600 hover:text-navy-900 hover:bg-navy-100'
     }`}
    >
     {p.id === 'mac' && <Apple size={14} className="shrink-0" />}
     {p.id === 'windows' && <Laptop size={14} className="shrink-0" />}
     {p.id === 'linux' && <Terminal size={14} className="shrink-0" />}
     {p.id === 'ios' && <Smartphone size={14} className="shrink-0" />}
     {p.id === 'android' && <Bot size={14} className="shrink-0" />}
     <span className="truncate">{p.shortName}</span>
     {isDetected && (
     <span
      title="Your detected operating system"
      className={`text-[9px] font-mono px-1 py-0.2 rounded leading-tight ${
      isSelected
       ? 'bg-black/20 text-black font-bold'
       : 'bg-vylant-blue/20 text-vylant-blue font-bold border border-vylant-blue/30'
      }`}
     >
      Auto
     </span>
     )}
    </button>
    );
   })}
   </div>
  </div>

  {/* Feedback Alert */}
  {downloadFeedback && (
   <div className="mx-6 mt-3 px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fade-in">
   <Check size={14} className="shrink-0" />
   <span>{downloadFeedback}</span>
   </div>
  )}

  {/* Main Body Content */}
  <div className="p-6 overflow-y-auto flex flex-col gap-4 flex-1">
   {/* ===================== MAC OS ===================== */}
   {selectedPlatform === 'mac' && (
   <div className="flex flex-col gap-4 animate-fade-in">
    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-navy-50 border-navy-200'}`}>
    <div className="flex items-center justify-between mb-3">
     <div>
     <div className="text-sm font-semibold">macOS Application Package</div>
     <div className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
      Universal binary installer for Apple Silicon (M1/M2/M3/M4) & Intel
     </div>
     </div>
     <div className="flex items-center gap-1 text-[11px] text-vylant-blue font-medium">
     {detectedPlatform === 'mac' && (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vylant-blue/15 text-vylant-blue border border-vylant-blue/30 font-semibold mr-1">
      Your System
      </span>
     )}
     <ShieldCheck size={14} />
     <span>macOS 12+</span>
     </div>
    </div>

    <div className="grid sm:grid-cols-2 gap-2">
     <button
     onClick={handleDownloadMac}
     className="py-2.5 px-4 rounded-lg font-bold text-xs bg-vylant-blue hover:bg-cyan-300 text-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
     >
     <Download size={15} />
     <span>Download Installer (.command)</span>
     </button>
     <button
     onClick={handleDownloadMacWebloc}
     className={`py-2.5 px-4 rounded-lg font-medium text-xs border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
      isDarkMode
      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
      : 'bg-white hover:bg-navy-100 border-navy-200 text-navy-800'
     }`}
     >
     <ExternalLink size={14} />
     <span>Download .webloc Shortcut</span>
     </button>
    </div>
    </div>

    <div className={`p-4 rounded-xl border text-xs flex flex-col gap-2.5 ${isDarkMode ? 'bg-[#05070a] border-white/5 text-white/70' : 'bg-navy-50 border-navy-200 text-navy-600'}`}>
    <div className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
     <span>Safari Standalone Dock Mode (Sonoma & Sequoia)</span>
    </div>
    <div className="flex flex-col gap-1.5 text-[11px] leading-relaxed">
     <div className="flex items-start gap-2">
     <span className="font-mono text-vylant-blue font-bold">1.</span>
     <span>Navigate to Vylant in <strong>Safari</strong>.</span>
     </div>
     <div className="flex items-start gap-2">
     <span className="font-mono text-vylant-blue font-bold">2.</span>
     <span>Select <strong>File</strong> in menu bar &rarr; <strong>Add to Dock...</strong></span>
     </div>
     <div className="flex items-start gap-2">
     <span className="font-mono text-vylant-blue font-bold">3.</span>
     <span>Click <strong>Add</strong> to launch Vylant in chromeless standalone window.</span>
     </div>
    </div>
    </div>
   </div>
   )}

   {/* ===================== WINDOWS ===================== */}
   {selectedPlatform === 'windows' && (
   <div className="flex flex-col gap-4 animate-fade-in">
    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-navy-50 border-navy-200'}`}>
    <div className="flex items-center justify-between mb-3">
     <div>
     <div className="text-sm font-semibold">Windows Standalone Launcher</div>
     <div className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
      Creates desktop icon and launches dedicated chromeless window
     </div>
     </div>
     <div className="flex items-center gap-1 text-[11px] text-vylant-blue font-medium">
     {detectedPlatform === 'windows' && (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vylant-blue/15 text-vylant-blue border border-vylant-blue/30 font-semibold mr-1">
      Your System
      </span>
     )}
     <ShieldCheck size={14} />
     <span>Windows 10 / 11</span>
     </div>
    </div>

    <div className="grid sm:grid-cols-2 gap-2">
     <button
     onClick={handleDownloadWindows}
     className="py-2.5 px-4 rounded-lg font-bold text-xs bg-vylant-blue hover:bg-cyan-300 text-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
     >
     <Download size={15} />
     <span>Download Windows Launcher (.bat)</span>
     </button>
     <button
     onClick={handleDownloadWindowsUrl}
     className={`py-2.5 px-4 rounded-lg font-medium text-xs border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
      isDarkMode
      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
      : 'bg-white hover:bg-navy-100 border-navy-200 text-navy-800'
     }`}
     >
     <ExternalLink size={14} />
     <span>Download Vylant.url</span>
     </button>
    </div>
    </div>

    <div className={`p-4 rounded-xl border text-xs flex flex-col gap-2 ${isDarkMode ? 'bg-[#05070a] border-white/5 text-white/70' : 'bg-navy-50 border-navy-200 text-navy-600'}`}>
    <div className="text-xs font-semibold text-white/90">Edge / Chrome App Installation</div>
    <p className="text-[11px] leading-relaxed">
     In Microsoft Edge or Chrome, click the <strong>Install App</strong> icon in the address bar to pin Vylant directly to your Taskbar and Start Menu.
    </p>
    </div>
   </div>
   )}

   {/* ===================== LINUX ===================== */}
   {selectedPlatform === 'linux' && (
   <div className="flex flex-col gap-4 animate-fade-in">
    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-navy-50 border-navy-200'}`}>
    <div className="flex items-center justify-between mb-3">
     <div>
     <div className="text-sm font-semibold">Linux Desktop Packages</div>
     <div className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
      Compatible with Ubuntu, Debian, Arch, Fedora & all XDG desktops
     </div>
     </div>
     <div className="flex items-center gap-1 text-[11px] text-vylant-blue font-medium">
     {detectedPlatform === 'linux' && (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vylant-blue/15 text-vylant-blue border border-vylant-blue/30 font-semibold mr-1">
      Your System
      </span>
     )}
     <ShieldCheck size={14} />
     <span>X11 / Wayland</span>
     </div>
    </div>

    <div className="grid sm:grid-cols-2 gap-2">
     <button
     onClick={handleDownloadLinuxInstaller}
     className="py-2.5 px-4 rounded-lg font-bold text-xs bg-vylant-blue hover:bg-cyan-300 text-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
     >
     <Download size={15} />
     <span>Download installer (.sh)</span>
     </button>
     <button
     onClick={handleDownloadLinuxDesktop}
     className={`py-2.5 px-4 rounded-lg font-medium text-xs border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
      isDarkMode
      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
      : 'bg-white hover:bg-navy-100 border-navy-200 text-navy-800'
     }`}
     >
     <ExternalLink size={14} />
     <span>Download vylant.desktop</span>
     </button>
    </div>
    </div>

    {/* Terminal One-Liner Box */}
    <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${isDarkMode ? 'bg-[#05070a] border-white/10' : 'bg-navy-900 text-white border-navy-700'}`}>
    <div className="flex items-center justify-between">
     <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
     <Terminal size={14} />
     <span>Quick Terminal Install</span>
     </div>
     <button
     onClick={() => copyToClipboard(linuxTerminalCommand, 'linux-cmd')}
     className="flex items-center gap-1 text-[11px] font-mono text-white/70 hover:text-white transition-colors cursor-pointer"
     >
     {copiedKey === 'linux-cmd' ? (
      <>
      <Check size={13} className="text-emerald-400" />
      <span className="text-emerald-400">Copied</span>
      </>
     ) : (
      <>
      <Copy size={13} />
      <span>Copy</span>
      </>
     )}
     </button>
    </div>

    <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-cyan-200 select-all overflow-x-auto">
     <code>{linuxTerminalCommand}</code>
    </div>
    <div className="text-[10px] text-white/40 font-mono">
     Installs launcher to ~/.local/share/applications/vylant.desktop with system icon.
    </div>
    </div>
   </div>
   )}

   {/* ===================== IOS ===================== */}
   {selectedPlatform === 'ios' && (
   <div className="flex flex-col gap-4 animate-fade-in">
    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-navy-50 border-navy-200'}`}>
    <div className="flex items-center justify-between mb-3">
     <div>
     <div className="text-sm font-semibold">iOS Configuration Profile</div>
     <div className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
      Adds Vylant WebClip directly to home screen via Apple profile
     </div>
     </div>
     <div className="flex items-center gap-1 text-[11px] text-vylant-blue font-medium">
     {detectedPlatform === 'ios' && (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vylant-blue/15 text-vylant-blue border border-vylant-blue/30 font-semibold mr-1">
      Your System
      </span>
     )}
     <ShieldCheck size={14} />
     <span>iOS 14+</span>
     </div>
    </div>

    <div className="grid sm:grid-cols-2 gap-2">
     <button
     onClick={handleDownloadIOS}
     className="py-2.5 px-4 rounded-lg font-bold text-xs bg-vylant-blue hover:bg-cyan-300 text-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
     >
     <Download size={15} />
     <span>Download Profile (.mobileconfig)</span>
     </button>
     <button
     onClick={() => copyToClipboard(currentUrl, 'ios-url')}
     className={`py-2.5 px-4 rounded-lg font-medium text-xs border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
      isDarkMode
      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
      : 'bg-white hover:bg-navy-100 border-navy-200 text-navy-800'
     }`}
     >
     {copiedKey === 'ios-url' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
     <span>{copiedKey === 'ios-url' ? 'Link Copied' : 'Copy Safari Link'}</span>
     </button>
    </div>
    </div>

    <div className="grid sm:grid-cols-5 gap-3">
    <div className={`sm:col-span-3 p-4 rounded-xl border text-xs flex flex-col justify-between ${isDarkMode ? 'bg-[#05070a] border-white/5 text-white/70' : 'bg-navy-50 border-navy-200 text-navy-600'}`}>
     <div>
     <div className="text-xs font-semibold text-white/90 mb-2">Safari Home Screen Setup</div>
     <div className="flex flex-col gap-1.5 text-[11px] leading-relaxed">
      <div className="flex items-start gap-2">
      <span className="font-mono text-vylant-blue font-bold">1.</span>
      <span>Open Vylant in <strong>Safari</strong>.</span>
      </div>
      <div className="flex items-start gap-2">
      <span className="font-mono text-vylant-blue font-bold">2.</span>
      <span>Tap the <strong>Share</strong> button (bottom bar).</span>
      </div>
      <div className="flex items-start gap-2">
      <span className="font-mono text-vylant-blue font-bold">3.</span>
      <span>Tap <strong>Add to Home Screen</strong> &rarr; <strong>Add</strong>.</span>
      </div>
     </div>
     </div>
    </div>

    <div className={`sm:col-span-2 p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 ${isDarkMode ? 'bg-[#05070a] border-white/5' : 'bg-navy-50 border-navy-200'}`}>
     <div className="text-[11px] font-mono text-white/60 flex items-center gap-1">
     <QrCode size={13} className="text-vylant-blue" />
     <span>Camera Scan</span>
     </div>
     {qrDataUrl ? (
     <div className="p-1 rounded-lg bg-white shadow-sm">
      <img src={qrDataUrl} alt="iOS QR" className="w-20 h-20 object-contain rounded" />
     </div>
     ) : (
     <div className="w-20 h-20 rounded bg-white/5 animate-pulse" />
     )}
     <span className="text-[10px] text-white/40">Point iPhone camera</span>
    </div>
    </div>
   </div>
   )}

   {/* ===================== ANDROID ===================== */}
   {selectedPlatform === 'android' && (
   <div className="flex flex-col gap-4 animate-fade-in">
    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-navy-50 border-navy-200'}`}>
    <div className="flex items-center justify-between mb-3">
     <div>
     <div className="text-sm font-semibold">Android Standalone App</div>
     <div className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
      Home screen installation with background sync and WebAPK
     </div>
     </div>
     <div className="flex items-center gap-1 text-[11px] text-vylant-blue font-medium">
     {detectedPlatform === 'android' && (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vylant-blue/15 text-vylant-blue border border-vylant-blue/30 font-semibold mr-1">
      Your System
      </span>
     )}
     <ShieldCheck size={14} />
     <span>Android 8+</span>
     </div>
    </div>

    <div className="grid sm:grid-cols-2 gap-2">
     {hasInstallPrompt ? (
     <button
      onClick={handleNativePrompt}
      className="py-2.5 px-4 rounded-lg font-bold text-xs bg-vylant-blue hover:bg-cyan-300 text-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
     >
      <Download size={15} />
      <span>Install Vylant (1-Tap)</span>
     </button>
     ) : (
     <button
      onClick={handleDownloadAndroidHelper}
      className="py-2.5 px-4 rounded-lg font-bold text-xs bg-vylant-blue hover:bg-cyan-300 text-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
     >
      <Download size={15} />
      <span>Download Android Package</span>
     </button>
     )}
     <button
     onClick={() => copyToClipboard(currentUrl, 'android-url')}
     className={`py-2.5 px-4 rounded-lg font-medium text-xs border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
      isDarkMode
      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
      : 'bg-white hover:bg-navy-100 border-navy-200 text-navy-800'
     }`}
     >
     {copiedKey === 'android-url' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
     <span>{copiedKey === 'android-url' ? 'Link Copied' : 'Copy Android Link'}</span>
     </button>
    </div>
    </div>

    <div className="grid sm:grid-cols-5 gap-3">
    <div className={`sm:col-span-3 p-4 rounded-xl border text-xs flex flex-col justify-between ${isDarkMode ? 'bg-[#05070a] border-white/5 text-white/70' : 'bg-navy-50 border-navy-200 text-navy-600'}`}>
     <div>
     <div className="text-xs font-semibold text-white/90 mb-2">Chrome / Samsung Internet</div>
     <div className="flex flex-col gap-1.5 text-[11px] leading-relaxed">
      <div className="flex items-start gap-2">
      <span className="font-mono text-vylant-blue font-bold">1.</span>
      <span>Open Vylant in Chrome or Samsung Internet.</span>
      </div>
      <div className="flex items-start gap-2">
      <span className="font-mono text-vylant-blue font-bold">2.</span>
      <span>Tap menu (<strong>&#8942;</strong>) in top right.</span>
      </div>
      <div className="flex items-start gap-2">
      <span className="font-mono text-vylant-blue font-bold">3.</span>
      <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
      </div>
     </div>
     </div>
    </div>

    <div className={`sm:col-span-2 p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 ${isDarkMode ? 'bg-[#05070a] border-white/5' : 'bg-navy-50 border-navy-200'}`}>
     <div className="text-[11px] font-mono text-white/60 flex items-center gap-1">
     <QrCode size={13} className="text-vylant-blue" />
     <span>Camera Scan</span>
     </div>
     {qrDataUrl ? (
     <div className="p-1 rounded-lg bg-white shadow-sm">
      <img src={qrDataUrl} alt="Android QR" className="w-20 h-20 object-contain rounded" />
     </div>
     ) : (
     <div className="w-20 h-20 rounded bg-white/5 animate-pulse" />
     )}
     <span className="text-[10px] text-white/40">Point Android camera</span>
    </div>
    </div>
   </div>
   )}
  </div>

  {/* Footer */}
  <div className={`flex items-center justify-between px-6 py-3.5 border-t ${isDarkMode ? 'border-white/10 bg-[#07080d]' : 'border-navy-100 bg-navy-50'}`}>
   <button
   onClick={() => {
    onMarkInstalled();
    onClose();
   }}
   className={`text-xs hover:underline cursor-pointer ${
    isDarkMode ? 'text-white/40 hover:text-white/70' : 'text-navy-400 hover:text-navy-600'
   }`}
   >
   Don&apos;t show again
   </button>
   <button
   onClick={onClose}
   className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
    isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-navy-200 hover:bg-navy-300 text-navy-800'
   }`}
   >
   Dismiss
   </button>
  </div>
  </div>
 </div>
 );
};

export default InstallAppModal;
