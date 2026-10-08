import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 Plus,
 Minus,
 Download,
 Apple,
 Bot,
 Terminal,
 Laptop,
 Smartphone,
 ChevronDown,
 ChevronUp,
 ShieldCheck,
 ArrowRight
} from 'lucide-react';
import { 
 detectUserPlatform, 
 getSystemSpecificDownloadInfo, 
 PLATFORMS, 
 PlatformId,
 triggerFileDownload,
 generateWindowsBat,
 generateMacInstallerScript,
 generateLinuxInstallerScript,
 generateIOSMobileConfig,
 generateAndroidHelperHtml
} from '../utils/downloadHelpers';

interface LandingPageProps {
 onLaunch: () => void;
 onLogin: () => void;
 onSignUp: () => void;
 onSupport: () => void;
 onPrivacy: () => void;
 onTerms: () => void;
 isLoggedIn: boolean;
 onDownloadApp?: (platform?: 'mac' | 'ios' | 'android' | 'linux' | 'windows') => void;
 appDownloaded?: boolean;
}

const faqItems = [
 {
 question: "What is Vylant?",
 answer: "Vylant is a next-generation high-fidelity communication platform designed for privacy, speed, and reliability. It combines cutting-edge security with a seamless user experience across all devices."
 },
 {
 question: "Is my data truly secure?",
 answer: "Yes. Vylant uses end-to-end encryption for all messages and media. We do not store your private keys on our servers, meaning even we cannot access your conversations."
 },
 {
 question: "Can I use it on multiple devices?",
 answer: "Absolutely. Vylant syncs your encrypted data across all your authorized devices in real-time. Whether you're on a phone, tablet, or desktop, your conversations go with you."
 },
 {
 question: "What makes Vylant different from other messaging apps?",
 answer: "Unlike many competitors, Vylant is built with a 'privacy-first' architecture. We don't track your location, read your contact lists for advertising, or sell your data. We focus purely on delivering the best communication experience possible."
 }
];

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch, onLogin, onSignUp, onSupport, onPrivacy, onTerms, isLoggedIn, onDownloadApp, appDownloaded }) => {
 const [currentImageIndex, setCurrentImageIndex] = useState(0);
 const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
 const [detectedPlatform, setDetectedPlatform] = useState<PlatformId>('windows');
 const [showAllPlatforms, setShowAllPlatforms] = useState<boolean>(false);
 const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

 const handleDownloadLauncher = (platform: PlatformId) => {
 const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vylant.net';
 let label = '';
 switch (platform) {
  case 'windows':
  triggerFileDownload(generateWindowsBat(appUrl), 'Vylant.bat', 'application/x-bat');
  label = 'Downloaded Vylant Windows Launcher (.bat)';
  break;
  case 'mac':
  triggerFileDownload(generateMacInstallerScript(appUrl), 'Vylant-macOS-Installer.command', 'application/x-sh');
  label = 'Downloaded macOS Installer (.command)';
  break;
  case 'linux':
  triggerFileDownload(generateLinuxInstallerScript(appUrl), 'vylant-linux-installer.sh', 'application/x-sh');
  label = 'Downloaded Linux Installer (.sh)';
  break;
  case 'ios':
  triggerFileDownload(generateIOSMobileConfig(appUrl), 'Vylant.mobileconfig', 'application/x-apple-asf');
  label = 'Downloaded iOS Profile (.mobileconfig)';
  break;
  case 'android':
  triggerFileDownload(generateAndroidHelperHtml(appUrl), 'Vylant-Android-Install.html', 'text/html');
  label = 'Downloaded Android Setup Helper';
  break;
  default:
  triggerFileDownload(generateWindowsBat(appUrl), 'Vylant.bat', 'application/x-bat');
  label = 'Downloaded Vylant.bat';
  break;
 }
 setDownloadNotice(label);
 setTimeout(() => setDownloadNotice(null), 4000);
 if (onDownloadApp) {
  onDownloadApp(platform);
 }
 };

 const slideshowImages = [
 "https://i.imgur.com/VzOt8gf.png",
 "https://i.imgur.com/mn2Mcmo.png",
 "https://i.imgur.com/rQHQlOC.png",
 "https://i.imgur.com/h9Yp662.png",
 "https://i.imgur.com/dDYlJq5.png"
 ];

 useEffect(() => {
 setDetectedPlatform(detectUserPlatform());
 }, []);

 useEffect(() => {
 const timer = setInterval(() => {
  setCurrentImageIndex((prev) => (prev + 1) % slideshowImages.length);
 }, 5000);
 return () => clearInterval(timer);
 }, [slideshowImages.length]);

 const sysInfo = useMemo(() => getSystemSpecificDownloadInfo(detectedPlatform), [detectedPlatform]);

 const renderPlatformIcon = (platformId: PlatformId, size: number = 20, className?: string) => {
 switch (platformId) {
  case 'mac': return <Apple size={size} className={className} />;
  case 'windows': return <Laptop size={size} className={className} />;
  case 'linux': return <Terminal size={size} className={className} />;
  case 'ios': return <Smartphone size={size} className={className} />;
  case 'android': return <Bot size={size} className={className} />;
  default: return <Download size={size} className={className} />;
 }
 };

 return (
 <div id="top" className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
  {/* Navigation */}
  <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6">
  <div className="flex items-center gap-3 cursor-pointer" onClick={() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })}>
    <img 
    src="/vylant_logo.png" 
    alt="Vylant Logo" 
    className="w-10 h-10 object-contain"
    referrerPolicy="no-referrer"
    />
  </div>
  
  <div className="flex items-center gap-4">
   
   {!isLoggedIn ? (
   <>
    <button 
    onClick={onLogin}
    className="px-4 py-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
    >
    Login
    </button>
    <button 
    onClick={onSignUp}
    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105 active:scale-95"
    >
    Join Now
    </button>
   </>
   ) : (
   <button 
    onClick={onLaunch}
    className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:bg-navy-200 transition-all transform hover:scale-105 active:scale-95"
   >
    Launch App
   </button>
   )}
  </div>
  </nav>

  {/* Hero Section */}
  <main className="relative z-10 max-w-7xl mx-auto px-8 pt-44 pb-32">
  <div className="grid lg:grid-cols-2 gap-16 items-center">
   {/* Left Side Content */}
   <motion.div
   initial={{ opacity: 0, x: -30 }}
   animate={{ opacity: 1, x: 0 }}
   transition={{ duration: 0.8, ease: "easeOut" }}
   >
   <h1 className="text-8xl md:text-9xl font-bold tracking-tighter mb-4 flex items-baseline gap-4 text-white">
    <span>Vylant</span>
   </h1>
   
   <div className="flex items-center gap-0 mb-8">
    <span className="text-2xl md:text-3xl font-medium text-white/40">Powered by</span>
    <img 
    src="/toai_logo.png" 
    alt="T0AI Logo" 
    className="h-8 md:h-10 w-auto object-contain ml-[-2px]"
    referrerPolicy="no-referrer"
    />
   </div>

   <h2 className="text-xl md:text-2xl font-medium text-white/80 mb-6 tracking-tight">
    The future of communication starts here.
   </h2>

   <p className="text-white/40 max-w-lg mb-12 leading-relaxed text-lg">
    Experience the next evolution of messaging. Vylant combines military-grade encryption with seamless real-time syncing to ensure your private conversations stay truly private, while delivering a lightning-fast experience across all your devices.
   </p>
   
   <div className="flex items-center gap-4 flex-wrap">
    <button 
    onClick={onSignUp}
    className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-500 hover:shadow-[0_0_40px_rgba(37,99,235,0.3)] transition-all transform hover:scale-105 active:scale-95"
    >
    Join Now
    </button>
    {onDownloadApp && !appDownloaded && (
    <button 
     onClick={() => handleDownloadLauncher(detectedPlatform)}
     className="px-10 py-5 bg-vylant-blue/10 border border-vylant-blue/30 text-vylant-blue hover:bg-vylant-blue/20 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(0,195,255,0.15)]"
    >
     <span>{sysInfo.primaryAction}</span>
    </button>
    )}
   </div>
   </motion.div>

   {/* Right Side Mockups */}
   <div className="relative">
   {/* Desktop Mockup */}
   <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 20 }}
    animate={{ opacity: 1, scale: 1.1, y: 0 }}
    transition={{ duration: 1, delay: 0.2 }}
    className="relative z-10 rounded-[2.5rem] p-3 bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl shadow-black/50"
   >
    <div className="aspect-[16/10] bg-black rounded-[2rem] overflow-hidden border border-white/5 relative">
    <AnimatePresence mode="wait">
     <motion.img 
     key={currentImageIndex}
     src={slideshowImages[currentImageIndex]} 
     alt="Vylant Interface" 
     initial={{ opacity: 0, scale: 1.05 }}
     animate={{ opacity: 1, scale: 1 }}
     exit={{ opacity: 0, scale: 0.95 }}
     transition={{ duration: 0.8, ease: "easeInOut" }}
     className="w-full h-full object-cover object-top absolute inset-0"
     referrerPolicy="no-referrer"
     />
    </AnimatePresence>
    
    {/* Slideshow Progress Dots */}
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
     {slideshowImages.map((_, i) => (
     <div 
      key={i}
      className={`h-1.5 rounded-full transition-all duration-500 ${
      currentImageIndex === i ? 'w-8 bg-cyan-400' : 'w-2 bg-white/20'
      }`}
     />
     ))}
    </div>
    </div>
   </motion.div>
   </div>
  </div>
  </main>
  
  {/* FAQ Section */}
  <section id="faq" className="relative z-10 max-w-5xl mx-auto px-8 pb-32">
  <motion.div 
   initial={{ opacity: 0, y: 20 }}
   whileInView={{ opacity: 1, y: 0 }}
   viewport={{ once: true }}
   className="text-center mb-16"
  >
   <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
   <p className="text-white/40 text-lg">Everything you need to know about Vylant.</p>
  </motion.div>

  <div className="space-y-4">
   {faqItems.map((item, i) => (
   <motion.div
    key={i}
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: i * 0.1 }}
    className="group"
   >
    <button
    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
    className={`w-full p-6 text-left rounded-[1.5rem] border transition-all duration-300 flex items-center justify-between ${
     expandedFaq === i 
     ? 'bg-white/[0.08] border-white/20' 
     : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
    }`}
    >
    <span className="text-lg font-semibold">{item.question}</span>
    <div className={`p-1.5 rounded-lg transition-colors ${expandedFaq === i ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
     {expandedFaq === i ? <Minus size={20} /> : <Plus size={20} />}
    </div>
    </button>
    
    <AnimatePresence>
    {expandedFaq === i && (
     <motion.div
     initial={{ height: 0, opacity: 0 }}
     animate={{ height: "auto", opacity: 1 }}
     exit={{ height: 0, opacity: 0 }}
     transition={{ duration: 0.3, ease: "easeInOut" }}
     className="overflow-hidden"
     >
     <div className="p-6 pt-2 text-white/60 leading-relaxed">
      {item.answer}
     </div>
     </motion.div>
    )}
    </AnimatePresence>
   </motion.div>
   ))}
  </div>
  </section>

  {/* Download Section */}
  <section className="relative z-10 max-w-5xl mx-auto px-8 pb-32">
  <motion.div
   initial={{ opacity: 0, y: 20 }}
   whileInView={{ opacity: 1, y: 0 }}
   viewport={{ once: true }}
   className="relative text-center"
  >
   <div className="max-w-3xl mx-auto mb-10">
   <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
    Download Vylant
   </h2>
   <p className="text-white/50 text-base md:text-lg leading-relaxed">
    Auto-detected for your system ({sysInfo.name}). Launch Vylant natively in a standalone window with zero browser clutter.
   </p>
   </div>

   {/* System-Specific Download Button (Detected OS) */}
   <div className="max-w-md mx-auto mb-8">
   <button
    onClick={() => handleDownloadLauncher(detectedPlatform)}
    className="w-full py-4 px-8 bg-vylant-blue text-black hover:bg-cyan-300 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 cursor-pointer shadow-[0_0_30px_rgba(0,195,255,0.25)] transform hover:scale-[1.02] active:scale-[0.98]"
   >
    <Download size={22} />
    <span>{sysInfo.primaryAction}</span>
   </button>

   {downloadNotice && (
    <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
    <ShieldCheck size={16} />
    <span>{downloadNotice}</span>
    </div>
   )}
   </div>

   {/* Toggle / Secondary Action to View Other Platforms */}
   <div className="flex flex-col items-center justify-center gap-4">
   <button
    onClick={() => setShowAllPlatforms(prev => !prev)}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/60 hover:text-white transition-all cursor-pointer"
   >
    {showAllPlatforms ? (
    <>
     <ChevronUp size={14} />
     <span>Hide other operating systems</span>
    </>
    ) : (
    <>
     <ChevronDown size={14} />
     <span>Download for another operating system</span>
    </>
    )}
   </button>

   {/* Other Platforms Grid (Hidden by default) */}
   <AnimatePresence>
    {showAllPlatforms && (
    <motion.div
     initial={{ opacity: 0, height: 0 }}
     animate={{ opacity: 1, height: 'auto' }}
     exit={{ opacity: 0, height: 0 }}
     transition={{ duration: 0.3 }}
     className="w-full overflow-hidden pt-2"
    >
     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-left">
     {PLATFORMS.filter(p => p.id !== detectedPlatform).map((p) => (
      <div
      key={p.id}
      onClick={() => handleDownloadLauncher(p.id)}
      className="p-4 rounded-xl bg-black border border-white/10 hover:border-vylant-blue/50 hover:bg-navy-900 transition-all cursor-pointer group flex items-center justify-between gap-3"
      >
      <div>
       <div className="font-semibold text-sm text-white mb-0.5">{p.name}</div>
       <div className="text-[11px] text-vylant-blue opacity-80 font-medium">Download App</div>
      </div>
      <div className="p-2 rounded-lg bg-white/5 text-white/80 group-hover:text-vylant-blue transition-colors flex-shrink-0">
       {renderPlatformIcon(p.id, 18)}
      </div>
      </div>
     ))}
     </div>
    </motion.div>
    )}
   </AnimatePresence>
   </div>
  </motion.div>
  </section>

  {/* Footer */}
  <footer className="relative z-10 py-16 border-t border-white/5">
  <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
   <div className="flex items-center gap-3 cursor-pointer" onClick={() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })}>
    <img 
    src="https://i.imgur.com/H3OS5zA.png" 
    alt="Vylant Logo" 
    className="w-8 h-8 object-contain"
    referrerPolicy="no-referrer"
    />
   </div>
   
   <div className="text-white/20 font-mono text-sm tracking-[0.3em] uppercase cursor-pointer hover:text-white/40 transition-colors" onClick={() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })}>
    vylant.net
   </div>

   <div className="flex gap-8 text-sm font-medium text-white/40">
    <a href="#" className="hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); onPrivacy(); }}>Privacy</a>
    <a href="#" className="hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); onTerms(); }}>Terms</a>
    <a href="#" className="hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); onSupport(); }}>Support</a>
   </div>
  </div>
  </footer>
 </div>
 );
};

export default LandingPage;
