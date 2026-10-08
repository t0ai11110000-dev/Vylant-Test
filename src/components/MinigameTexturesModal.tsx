import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Upload, Crown, Save, Trash2, Check, RefreshCw, Gamepad2, Image as ImageIcon } from 'lucide-react';

export interface MinigameTextureConfig {
 id: string;
 name: string;
 birdTexture?: string; // base64 or URL
 pipeColor?: string;
 pipeTexture?: string;
 birdBgColor?: string;
 snakeHeadTexture?: string;
 snakeBodyColor?: string;
 snakeFoodTexture?: string;
 snakeBgColor?: string;
}

export const DEFAULT_TEXTURE_PRESETS: MinigameTextureConfig[] = [
 {
  id: 'default',
  name: 'Original Vylant',
  birdTexture: 'https://i.imgur.com/H3OS5zA.png',
  pipeColor: '#22c55e',
  birdBgColor: '#0f172a',
  snakeHeadTexture: 'https://i.imgur.com/H3OS5zA.png',
  snakeBodyColor: '#3b82f6',
  snakeBgColor: '#0f172a'
 },
 {
  id: 'cyberpunk',
  name: 'Cyberpunk Neon',
  birdTexture: 'https://i.imgur.com/H3OS5zA.png',
  pipeColor: '#ec4899',
  birdBgColor: '#180828',
  snakeHeadTexture: 'https://i.imgur.com/H3OS5zA.png',
  snakeBodyColor: '#06b6d4',
  snakeBgColor: '#0f051d'
 },
 {
  id: 'golden_crown',
  name: 'Golden Supporter',
  birdTexture: 'https://i.imgur.com/H3OS5zA.png',
  pipeColor: '#eab308',
  birdBgColor: '#1e1b00',
  snakeHeadTexture: 'https://i.imgur.com/H3OS5zA.png',
  snakeBodyColor: '#f59e0b',
  snakeBgColor: '#1a1300'
 }
];

export interface MinigameTexturesEditorProps {
 isDarkMode: boolean;
 isPremium: boolean;
 onUnlockSupporter?: () => void;
 activeConfig: MinigameTextureConfig;
 onSaveConfig: (config: MinigameTextureConfig) => void;
}

export const MinigameTexturesEditor: React.FC<MinigameTexturesEditorProps> = ({
 isDarkMode,
 isPremium,
 onUnlockSupporter,
 activeConfig,
 onSaveConfig,
}) => {
 const [presets, setPresets] = useState<MinigameTextureConfig[]>(() => {
  try {
   const stored = localStorage.getItem('vylant_minigame_presets');
   if (stored) {
    return [...DEFAULT_TEXTURE_PRESETS, ...JSON.parse(stored)];
   }
  } catch (e) {
   console.error(e);
  }
  return DEFAULT_TEXTURE_PRESETS;
 });

 const [currentConfig, setCurrentConfig] = useState<MinigameTextureConfig>(activeConfig);
 const [presetNameInput, setPresetNameInput] = useState('');
 const [activeTab, setActiveTab] = useState<'bird' | 'snake' | 'presets'>('bird');
 const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

 useEffect(() => {
  setCurrentConfig(activeConfig);
 }, [activeConfig]);

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof MinigameTextureConfig) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
   alert("Image size should be under 2MB.");
   return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
   if (event.target?.result) {
    setCurrentConfig(prev => ({
     ...prev,
     [field]: event.target?.result as string
    }));
   }
  };
  reader.readAsDataURL(file);
 };

 const handleApplyConfig = (configToApply: MinigameTextureConfig) => {
  setCurrentConfig(configToApply);
  onSaveConfig(configToApply);
  setSaveSuccessMsg(true);
  setTimeout(() => setSaveSuccessMsg(false), 2000);
 };

 const handleSaveAsNewPreset = () => {
  if (!presetNameInput.trim()) return;
  const newPreset: MinigameTextureConfig = {
   ...currentConfig,
   id: 'custom_' + Date.now(),
   name: presetNameInput.trim()
  };

  const updatedPresets = [...presets, newPreset];
  setPresets(updatedPresets);

  // Save custom ones to localStorage
  const customOnly = updatedPresets.filter(p => !DEFAULT_TEXTURE_PRESETS.some(d => d.id === p.id));
  localStorage.setItem('vylant_minigame_presets', JSON.stringify(customOnly));

  setPresetNameInput('');
  handleApplyConfig(newPreset);
 };

 const handleDeletePreset = (id: string) => {
  if (DEFAULT_TEXTURE_PRESETS.some(d => d.id === id)) return;
  const updated = presets.filter(p => p.id !== id);
  setPresets(updated);
  const customOnly = updated.filter(p => !DEFAULT_TEXTURE_PRESETS.some(d => d.id === p.id));
  localStorage.setItem('vylant_minigame_presets', JSON.stringify(customOnly));
 };

 if (!isPremium) {
  return (
   <div className={`p-8 rounded-2xl border text-center flex flex-col items-center justify-center ${
    isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/50 border-amber-200'
   }`}>
    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20 mb-4 animate-bounce">
     <Crown size={32} />
    </div>
    <h3 className="text-xl font-bold mb-2">Supporter Exclusive Feature</h3>
    <p className={`text-sm max-w-md mb-6 ${isDarkMode ? 'text-white/70' : 'text-navy-600'}`}>
     Custom minigame textures, bird skin uploads, custom pipe & snake colors, and unlimited texture presets are available exclusively to Vylant Supporters.
    </p>
    
    {onUnlockSupporter && (
     <button
      onClick={onUnlockSupporter}
      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2"
     >
      <Crown size={16} />
      Unlock Supporter Perks
     </button>
    )}
   </div>
  );
 }

 return (
  <div className="space-y-5">
   {/* Header Info */}
   <div className="flex items-center justify-between pb-3 border-b border-white/10">
    <div className="flex items-center gap-3">
     <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
      <Sparkles size={20} />
     </div>
     <div>
      <div className="flex items-center gap-2">
       <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500">Minigame Custom Textures</h3>
      </div>
      <p className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-navy-500'}`}>
       Customize bird/snake graphics and manage saved presets
      </p>
     </div>
    </div>
   </div>

   {/* Game Tabs */}
   <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/20 border border-white/5">
    <button
     type="button"
     onClick={() => setActiveTab('bird')}
     className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
      activeTab === 'bird'
       ? 'bg-vylant-blue text-white shadow-md'
       : isDarkMode ? 'text-white/60 hover:text-white' : 'text-navy-600 hover:text-navy-900'
     }`}
    >
     <Gamepad2 size={14} /> Vylant Bird
    </button>
    <button
     type="button"
     onClick={() => setActiveTab('snake')}
     className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
      activeTab === 'snake'
       ? 'bg-vylant-blue text-white shadow-md'
       : isDarkMode ? 'text-white/60 hover:text-white' : 'text-navy-600 hover:text-navy-900'
     }`}
    >
     <Gamepad2 size={14} /> Vylant Snake
    </button>
    <button
     type="button"
     onClick={() => setActiveTab('presets')}
     className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
      activeTab === 'presets'
       ? 'bg-amber-500 text-black shadow-md'
       : isDarkMode ? 'text-white/60 hover:text-white' : 'text-navy-600 hover:text-navy-900'
     }`}
    >
     <Crown size={14} /> Saved Presets
    </button>
   </div>

   {/* Tab 1: Vylant Bird Textures */}
   {activeTab === 'bird' && (
    <div className="space-y-4">
     {/* Bird Skin */}
     <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-navy-50 border-navy-200'}`}>
      <div className="flex items-center justify-between mb-3">
       <div>
        <h4 className="text-xs font-bold uppercase tracking-wider">Bird Character Skin</h4>
        <p className={`text-[11px] ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
         Upload a PNG or GIF image for the flying bird character
        </p>
       </div>
       {currentConfig.birdTexture && (
        <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center justify-center">
         <img src={currentConfig.birdTexture} alt="Bird skin" className="w-full h-full object-contain" />
        </div>
       )}
      </div>
      <div className="flex items-center gap-3">
       <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-vylant-blue/40 bg-vylant-blue/10 hover:bg-vylant-blue/20 text-vylant-blue text-xs font-bold cursor-pointer transition-all">
        <Upload size={14} />
        Upload Image (PNG/JPG)
        <input
         type="file"
         accept="image/*"
         onChange={(e) => handleFileUpload(e, 'birdTexture')}
         className="hidden"
        />
       </label>
       {currentConfig.birdTexture && (
        <button
         type="button"
         onClick={() => setCurrentConfig(prev => ({ ...prev, birdTexture: 'https://i.imgur.com/H3OS5zA.png' }))}
         className="p-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/10 text-white/60 hover:text-white"
         title="Reset to default"
        >
         <RefreshCw size={14} />
        </button>
       )}
      </div>
     </div>

     {/* Pipe Color / Styling */}
     <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-navy-50 border-navy-200'}`}>
      <div className="flex items-center justify-between mb-3">
       <div>
        <h4 className="text-xs font-bold uppercase tracking-wider">Pipe Color</h4>
        <p className={`text-[11px] ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
         Select obstacle pipe color
        </p>
       </div>
       <div className="flex items-center gap-2">
        <input
         type="color"
         value={currentConfig.pipeColor || '#22c55e'}
         onChange={(e) => setCurrentConfig(prev => ({ ...prev, pipeColor: e.target.value }))}
         className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
        />
       </div>
      </div>
     </div>

     {/* Bird Background Color */}
     <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-navy-50 border-navy-200'}`}>
      <div className="flex items-center justify-between mb-3">
       <div>
        <h4 className="text-xs font-bold uppercase tracking-wider">Background Tint / Color</h4>
        <p className={`text-[11px] ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
         Canvas background color for Vylant Bird
        </p>
       </div>
       <input
        type="color"
        value={currentConfig.birdBgColor || '#0f172a'}
        onChange={(e) => setCurrentConfig(prev => ({ ...prev, birdBgColor: e.target.value }))}
        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
       />
      </div>
     </div>
    </div>
   )}

   {/* Tab 2: Vylant Snake Textures */}
   {activeTab === 'snake' && (
    <div className="space-y-4">
     {/* Snake Head Texture */}
     <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-navy-50 border-navy-200'}`}>
      <div className="flex items-center justify-between mb-3">
       <div>
        <h4 className="text-xs font-bold uppercase tracking-wider">Snake Head Icon / Texture</h4>
        <p className={`text-[11px] ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
         Upload custom head texture for snake
        </p>
       </div>
       {currentConfig.snakeHeadTexture && (
        <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center justify-center">
         <img src={currentConfig.snakeHeadTexture} alt="Snake head" className="w-full h-full object-contain" />
        </div>
       )}
      </div>
      <div className="flex items-center gap-3">
       <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-vylant-blue/40 bg-vylant-blue/10 hover:bg-vylant-blue/20 text-vylant-blue text-xs font-bold cursor-pointer transition-all">
        <Upload size={14} />
        Upload Head Texture
        <input
         type="file"
         accept="image/*"
         onChange={(e) => handleFileUpload(e, 'snakeHeadTexture')}
         className="hidden"
        />
       </label>
      </div>
     </div>

     {/* Snake Body Color */}
     <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-navy-50 border-navy-200'}`}>
      <div className="flex items-center justify-between mb-3">
       <div>
        <h4 className="text-xs font-bold uppercase tracking-wider">Snake Body Color</h4>
        <p className={`text-[11px] ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
         Color of the snake segments
        </p>
       </div>
       <input
        type="color"
        value={currentConfig.snakeBodyColor || '#3b82f6'}
        onChange={(e) => setCurrentConfig(prev => ({ ...prev, snakeBodyColor: e.target.value }))}
        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
       />
      </div>
     </div>

     {/* Snake Canvas Bg Color */}
     <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-navy-50 border-navy-200'}`}>
      <div className="flex items-center justify-between mb-3">
       <div>
        <h4 className="text-xs font-bold uppercase tracking-wider">Snake Background Color</h4>
        <p className={`text-[11px] ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
         Canvas background color for Snake
        </p>
       </div>
       <input
        type="color"
        value={currentConfig.snakeBgColor || '#0f172a'}
        onChange={(e) => setCurrentConfig(prev => ({ ...prev, snakeBgColor: e.target.value }))}
        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
       />
      </div>
     </div>
    </div>
   )}

   {/* Tab 3: Presets Manager */}
   {activeTab === 'presets' && (
    <div className="space-y-4">
     {/* Save current config as preset */}
     <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
      <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-amber-400">
       <Save size={14} /> Save Current Setup As Preset
      </h4>
      <div className="flex items-center gap-2">
       <input
        type="text"
        placeholder="Preset Name (e.g. Dragon Skin)"
        value={presetNameInput}
        onChange={(e) => setPresetNameInput(e.target.value)}
        className={`flex-1 px-3 py-2 rounded-xl text-xs outline-none border ${
         isDarkMode ? 'bg-black/30 border-white/10 text-white placeholder:text-white/30' : 'bg-white border-navy-200 text-navy-900'
        }`}
       />
       <button
        type="button"
        onClick={handleSaveAsNewPreset}
        disabled={!presetNameInput.trim()}
        className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs disabled:opacity-40 hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
       >
        Save Preset
       </button>
      </div>
     </div>

     {/* List of presets */}
     <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">Available Presets</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
       {presets.map((preset) => {
        const isActive = currentConfig.id === preset.id || currentConfig.name === preset.name;
        const isDefault = DEFAULT_TEXTURE_PRESETS.some(d => d.id === preset.id);

        return (
         <div
          key={preset.id}
          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
           isActive
            ? 'bg-vylant-blue/20 border-vylant-blue text-white shadow-lg shadow-vylant-blue/10'
            : isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-navy-50 border-navy-200 hover:bg-navy-100'
          }`}
         >
          <div className="flex items-center gap-3 min-w-0 flex-1">
           {preset.birdTexture && (
            <div className="w-8 h-8 rounded-lg bg-black/40 p-1 flex items-center justify-center shrink-0 border border-white/10">
             <img src={preset.birdTexture} alt={preset.name} className="w-full h-full object-contain" />
            </div>
           )}
           <div className="truncate">
            <h5 className="text-xs font-bold truncate">{preset.name}</h5>
            <div className="flex items-center gap-1 mt-0.5">
             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.pipeColor || '#22c55e' }} title="Pipe color" />
             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.snakeBodyColor || '#3b82f6' }} title="Snake color" />
             <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: preset.birdBgColor || '#0f172a' }} title="Background" />
            </div>
           </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
           <button
            type="button"
            onClick={() => handleApplyConfig(preset)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
             isActive
              ? 'bg-vylant-blue text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
           >
            {isActive ? <Check size={12} /> : 'Apply'}
           </button>
           {!isDefault && (
            <button
             type="button"
             onClick={() => handleDeletePreset(preset.id)}
             className="p-1.5 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
             title="Delete preset"
            >
             <Trash2 size={12} />
            </button>
           )}
          </div>
         </div>
        );
       })}
      </div>
     </div>
    </div>
   )}

   {/* Save Button */}
   <div className="pt-4 border-t border-white/10 flex items-center justify-between">
    {saveSuccessMsg ? (
     <span className="text-xs font-bold text-green-400 flex items-center gap-1 animate-pulse">
      <Check size={14} /> Textures Applied & Saved!
     </span>
    ) : (
     <span className="text-[11px] text-white/40">Applies instantly across minigames</span>
    )}

    <button
     type="button"
     onClick={() => handleApplyConfig(currentConfig)}
     className="px-6 py-2.5 rounded-xl bg-vylant-blue text-white font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-vylant-blue/20"
    >
     Save & Apply Textures
    </button>
   </div>
  </div>
 );
};

interface MinigameTexturesModalProps extends MinigameTexturesEditorProps {
 isOpen: boolean;
 onClose: () => void;
}

const MinigameTexturesModal: React.FC<MinigameTexturesModalProps> = (props) => {
 if (!props.isOpen) return null;

 return (
  <AnimatePresence>
   <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={{ opacity: 0 }}
     onClick={props.onClose}
     className="absolute inset-0 bg-black/70 backdrop-blur-md"
    />
    <motion.div
     initial={{ scale: 0.95, opacity: 0, y: 10 }}
     animate={{ scale: 1, opacity: 1, y: 0 }}
     exit={{ scale: 0.95, opacity: 0, y: 10 }}
     className={`relative w-full max-w-2xl rounded-3xl p-6 shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col z-10 ${
      props.isDarkMode ? 'bg-vylant-navy border-white/10 text-white' : 'bg-white border-navy-200 text-navy-900'
     }`}
    >
     <div className="flex justify-end mb-2">
      <button
       type="button"
       onClick={props.onClose}
       className={`p-2 rounded-xl transition-colors ${
        props.isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-navy-100 text-navy-400 hover:text-navy-700'
       }`}
      >
       <X size={18} />
      </button>
     </div>
     <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
      <MinigameTexturesEditor {...props} />
     </div>
    </motion.div>
   </div>
  </AnimatePresence>
 );
};

export default MinigameTexturesModal;
