import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Star, 
  History, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  Loader2, 
  Grid
} from 'lucide-react';
import { 
  GifItem, 
  GIF_CATEGORIES, 
  filterGifs, 
  getFavoriteGifs, 
  saveFavoriteGif, 
  addRecentGif 
} from '../data/gifCatalog';

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gif: GifItem) => void;
  isDarkMode: boolean;
  position?: 'bottom-left' | 'bottom-right' | 'modal';
}

export const GifPicker: React.FC<GifPickerProps> = ({
  isOpen,
  onClose,
  onSelectGif,
  isDarkMode,
  position = 'bottom-right'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('trending');
  const [remoteGifs, setRemoteGifs] = useState<GifItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favoriteUrls, setFavoriteUrls] = useState<string[]>(() => 
    getFavoriteGifs().map(g => g.url)
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Fetch online GIFs from server API when searching or switching trending
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const controller = new AbortController();

    const fetchGifs = async () => {
      if (activeCategory === 'favorites' || activeCategory === 'recents') {
        setRemoteGifs([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let endpoint = '/api/gifs/trending?limit=30';
        if (searchQuery.trim()) {
          endpoint = `/api/gifs/search?q=${encodeURIComponent(searchQuery.trim())}&limit=30`;
        } else if (activeCategory !== 'trending' && activeCategory !== 'all') {
          endpoint = `/api/gifs/search?q=${encodeURIComponent(activeCategory)}&limit=30`;
        }

        const res = await fetch(endpoint, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.results) && data.results.length > 0) {
            setRemoteGifs(data.results);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // silently fallback to local catalog
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchGifs();
    }, 250);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(debounceTimer);
    };
  }, [searchQuery, activeCategory, isOpen]);

  // Combine curated local fallback with remote GIFs, deduplicated
  const displayedGifs = useMemo(() => {
    const localFiltered = filterGifs(searchQuery, activeCategory);
    
    if (activeCategory === 'favorites' || activeCategory === 'recents') {
      return localFiltered;
    }

    if (remoteGifs.length > 0) {
      // Merge remote + local ensuring no duplicates
      const seen = new Set<string>();
      const combined: GifItem[] = [];

      for (const g of remoteGifs) {
        if (!seen.has(g.url)) {
          seen.add(g.url);
          combined.push(g);
        }
      }

      for (const g of localFiltered) {
        if (!seen.has(g.url)) {
          seen.add(g.url);
          combined.push(g);
        }
      }

      return combined;
    }

    return localFiltered;
  }, [searchQuery, activeCategory, remoteGifs]);

  const handleSelect = (gif: GifItem) => {
    addRecentGif(gif);
    onSelectGif(gif);
    onClose();
  };

  const handleToggleFavorite = (e: React.MouseEvent, gif: GifItem) => {
    e.stopPropagation();
    const updated = saveFavoriteGif(gif);
    setFavoriteUrls(updated.map(g => g.url));
  };

  const handleCopyLink = (e: React.MouseEvent, gif: GifItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(gif.url);
    setCopiedId(gif.id || gif.url);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        ref={containerRef}
        className={`fixed md:absolute z-[9999] ${
          position === 'modal'
            ? 'inset-x-4 bottom-20 md:inset-auto md:bottom-full md:right-0 md:mb-3'
            : position === 'bottom-left'
            ? 'left-4 bottom-20 md:left-0 md:bottom-full md:mb-3'
            : 'right-4 bottom-20 md:right-0 md:bottom-full md:mb-3'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`w-[calc(100vw-32px)] sm:w-[420px] h-[520px] max-h-[80vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl ${
            isDarkMode 
              ? 'bg-[#111318]/95 border-white/10 text-white shadow-black/80' 
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/40'
          }`}
        >
          {/* Header Bar */}
          <div className={`p-4 border-b flex items-center justify-between gap-3 ${
            isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-xl bg-vylant-blue/20 text-vylant-blue font-black text-xs tracking-wider border border-vylant-blue/30 uppercase flex items-center gap-1.5 shadow-sm">
                <Sparkles size={13} className="text-vylant-blue" />
                <span>GIF Studio</span>
              </div>
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`}>
                Tenor & Giphy
              </span>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors ${
                isDarkMode ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3.5 pb-2">
            <div className={`relative flex items-center rounded-2xl border transition-all ${
              isDarkMode 
                ? 'bg-black/40 border-white/10 focus-within:border-vylant-blue/50' 
                : 'bg-slate-100 border-slate-200 focus-within:border-vylant-blue/50'
            }`}>
              <Search size={16} className={`ml-3.5 shrink-0 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Tenor & Giphy GIFs..."
                className={`w-full py-2.5 px-3 bg-transparent text-xs sm:text-sm focus:outline-none ${
                  isDarkMode ? 'text-white placeholder:text-white/30' : 'text-slate-900 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`mr-2.5 p-1 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-white/10 text-white/40' : 'hover:bg-slate-200 text-slate-400'
                  }`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Category Chips */}
          <div className="px-3 pb-2.5 overflow-x-auto custom-scrollbar flex items-center gap-1.5 shrink-0">
            {/* Favorites Tab */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory('favorites');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeCategory === 'favorites'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                  : isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-white/70'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Star size={12} className={activeCategory === 'favorites' ? 'fill-slate-950' : 'text-amber-400'} />
              <span>Favorites</span>
            </button>

            {/* Recents Tab */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory('recents');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeCategory === 'recents'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 scale-105'
                  : isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-white/70'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <History size={12} />
              <span>Recents</span>
            </button>

            {/* General Categories */}
            {GIF_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  activeCategory === cat.id && !searchQuery
                    ? 'bg-vylant-blue text-slate-950 shadow-md shadow-vylant-blue/20 scale-105'
                    : isDarkMode
                    ? 'bg-white/5 hover:bg-white/10 text-white/70'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* GIF Grid / Results */}
          <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-vylant-blue">
                <Loader2 size={32} className="animate-spin" />
                <span className={`text-xs font-bold ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                  Finding matching GIFs...
                </span>
              </div>
            ) : displayedGifs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/30' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                  {activeCategory === 'favorites' ? (
                    <Star size={32} />
                  ) : activeCategory === 'recents' ? (
                    <History size={32} />
                  ) : (
                    <Search size={32} />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    {activeCategory === 'favorites'
                      ? 'No Favorite GIFs Yet'
                      : activeCategory === 'recents'
                      ? 'No Recent GIFs'
                      : 'No GIFs Found'}
                  </h4>
                  <p className={`text-xs mt-1 max-w-[240px] ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>
                    {activeCategory === 'favorites'
                      ? 'Click the star on any GIF in the picker to save it here for quick access!'
                      : activeCategory === 'recents'
                      ? 'GIFs you send will appear here for fast re-use.'
                      : 'Try searching for words like "cat", "happy", "party", "dance", or "rage".'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {displayedGifs.map((gif, idx) => {
                  const isFav = favoriteUrls.includes(gif.url);
                  const isCopied = copiedId === (gif.id || gif.url);

                  return (
                    <motion.div
                      key={gif.id || `${gif.url}-${idx}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                      onClick={() => handleSelect(gif)}
                      className={`group relative rounded-2xl overflow-hidden cursor-pointer border transition-all duration-200 aspect-[4/3] bg-black/20 ${
                        isDarkMode 
                          ? 'border-white/10 hover:border-vylant-blue/60 hover:shadow-lg hover:shadow-vylant-blue/10' 
                          : 'border-slate-200 hover:border-vylant-blue/60 hover:shadow-md'
                      }`}
                    >
                      {/* GIF Image */}
                      <img
                        src={gif.previewUrl || gif.url}
                        alt={gif.title || 'GIF'}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />

                      {/* GIF Pill Badge */}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-[9px] font-black text-white/90 uppercase tracking-widest pointer-events-none">
                        GIF
                      </div>

                      {/* Top Action Overlay (Favorite + Copy) */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(e, gif)}
                          className={`p-1.5 rounded-xl backdrop-blur-md border transition-all ${
                            isCopied
                              ? 'bg-emerald-500 text-white border-emerald-400'
                              : 'bg-black/75 hover:bg-black text-white/80 hover:text-white border-white/20'
                          }`}
                          title={isCopied ? 'Copied Link!' : 'Copy GIF Link'}
                        >
                          {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        </button>

                        {/* Favorite Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, gif)}
                          className={`p-1.5 rounded-xl backdrop-blur-md border transition-all ${
                            isFav
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-black/75 hover:bg-black text-white/80 hover:text-amber-400 border-white/20'
                          }`}
                          title={isFav ? 'Remove Favorite' : 'Save to Favorites'}
                        >
                          <Star size={12} className={isFav ? 'fill-slate-950' : ''} />
                        </button>
                      </div>

                      {/* Bottom Gradient with Title & Quick Send */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-white truncate max-w-[70%] drop-shadow-sm">
                          {gif.title}
                        </span>
                        <div className="px-2 py-1 rounded-lg bg-vylant-blue text-slate-950 text-[10px] font-black uppercase flex items-center gap-1 shadow-md shadow-vylant-blue/30 shrink-0">
                          <span>Send</span>
                          <Send size={10} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className={`p-2.5 px-4 border-t flex items-center justify-between text-[11px] ${
            isDarkMode ? 'border-white/10 bg-black/20 text-white/40' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}>
            <span>Click any GIF to send immediately</span>
            <span className="font-mono text-[10px] opacity-70">Powered by Tenor & Giphy</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
