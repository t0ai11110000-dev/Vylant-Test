import React, { useState, useEffect } from 'react';
import { Compass, Users, ShieldCheck, Map, Loader2, ArrowRight, Search, X, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

interface Server {
  id: string;
  name: string;
  initials?: string;
  image?: string;
  icon?: string;
  banner?: string;
  description?: string;
  verified?: boolean;
  color?: string;
  ownerId?: string;
  is18Plus?: boolean;
  showMemberCount?: boolean;
  hasMarketplace?: boolean;
  showMarketplaceInDiscovery?: boolean;
}

interface ServerDiscoveryProps {
  isDarkMode: boolean;
  onJoinServer: (server: Server) => void;
  joinedServers: string[];
}

const ServerDiscovery: React.FC<ServerDiscoveryProps> = ({ isDarkMode, onJoinServer, joinedServers }) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'general' | 'marketplace' | '18plus' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const token = localStorage.getItem('vylant_token') || sessionStorage.getItem('vylant_token');
        const res = await fetch('/api/servers/discover', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch servers');
        const data = await res.json();
        setServers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServers();
  }, []);

  const searchedServers = servers.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query))
    );
  });

  const standardServers = searchedServers.filter(s => !s.is18Plus);
  const matureServers = searchedServers.filter(s => s.is18Plus);
  const verifiedServers = searchedServers.filter(s => s.verified);
  const marketplaceServers = searchedServers.filter(s => s.hasMarketplace && s.showMarketplaceInDiscovery);

  // Separated lists for the 'all' tab
  const discoverVerified = searchedServers.filter(s => s.verified);
  const discoverGeneral = searchedServers.filter(s => !s.is18Plus && !s.verified);
  const discoverMature = searchedServers.filter(s => s.is18Plus && !s.verified);

  const renderServerCard = (server: Server, index: number) => {
    const isJoined = joinedServers.includes(server.id);
    const isMature = server.is18Plus;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, ease: "easeOut" }}
        key={server.id}
        className={`overflow-hidden flex flex-col transition-all duration-200 border rounded-2xl ${
          isDarkMode 
            ? server.id === '1'
              ? 'bg-slate-900/60 border-emerald-500/25 shadow-lg shadow-emerald-500/5'
              : 'bg-slate-900/40 border-white/5 hover:border-vylant-blue/30 hover:bg-slate-900/60' 
            : server.id === '1'
              ? 'bg-emerald-500/5 border-emerald-500/20 shadow-md'
              : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        {/* Simple elegant header without banner image clutter for a fresher, minimal vibe */}
        <div className={`h-2 text-left ${
          server.id === '1'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
            : server.verified
              ? 'bg-emerald-400'
              : (server.hasMarketplace && server.showMarketplaceInDiscovery)
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                : isMature ? 'bg-rose-500' : 'bg-vylant-blue'
        }`} />
        
        <div className="p-6 flex-1 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {/* Server Avatar */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 relative overflow-hidden ${
                server.image ? '' : (server.color || (server.id === '1' || server.verified ? 'bg-emerald-500 text-white' : isMature ? 'bg-rose-500 text-white' : 'bg-vylant-blue text-white'))
              }`}>
                {server.image ? (
                  <img src={server.image} alt={server.name} className="w-full h-full object-cover" />
                ) : (
                  server.initials || server.name.substring(0, 2).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base font-semibold truncate tracking-tight">{server.name}</h2>
                  {(server.verified || server.id === '1') && (
                    <span className="text-emerald-550" title={server.id === '1' ? "Vylant Official Hub" : "Verified Server"}>
                      <ShieldCheck size={16} className="fill-emerald-500/15 text-emerald-500" />
                    </span>
                  )}
                </div>
                
                {/* Minimal pill indicators */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {server.id === '1' ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                      Official
                    </span>
                  ) : server.verified ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/5 text-emerald-500 font-medium border border-emerald-500/10">
                      Verified
                    </span>
                  ) : null}

                  {server.hasMarketplace && server.showMarketplaceInDiscovery && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/25 flex items-center gap-1">
                      <ShoppingBag size={10} className="text-purple-400" />
                      Marketplace
                    </span>
                  )}

                  {isMature ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-450 font-medium border border-rose-500/20">
                      18+ Only
                    </span>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      isDarkMode ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500'
                    }`}>
                      Public
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className={`text-sm leading-relaxed line-clamp-3 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
              {server.description || 'Welcome to this public community! Join to start chatting and hanging out.'}
            </p>
          </div>

          <button
            onClick={() => onJoinServer(server)}
            disabled={isJoined}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-2 ${
              isJoined 
                ? (isDarkMode ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-50 text-slate-400 cursor-not-allowed')
                : (isMature
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                  : 'bg-vylant-blue hover:bg-cyan-600 text-white shadow-sm')
            }`}
          >
            {isJoined ? 'Joined' : 'Join'}
            {!isJoined && <ArrowRight size={14} />}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${isDarkMode ? 'bg-vylant-navy text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER SECTION */}
      <div className={`p-8 md:p-10 border-b relative sticky top-0 z-10 backdrop-blur-md ${
        isDarkMode ? 'border-white/5 bg-vylant-navy/80' : 'border-slate-150 bg-slate-50/80'
      }`}>
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-white/5 text-vylant-blue' : 'bg-slate-100 text-slate-700'}`}>
                <Compass size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
                <p className={`text-sm ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>
                  Explore public spaces and partner communities on Vylant
                </p>
              </div>
            </div>

            {/* Simple Clean Tabs */}
            <div className="flex items-center flex-wrap gap-1.5">
              {/* ALL SERVERS */}
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeFilter === 'all'
                    ? isDarkMode 
                      ? 'bg-white/10 text-white font-semibold' 
                      : 'bg-slate-900 text-white font-semibold shadow-sm'
                    : isDarkMode 
                      ? 'hover:bg-white/5 text-white/50 hover:text-white' 
                      : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({searchQuery ? searchedServers.length : servers.length})
              </button>

              {/* GENERAL SERVERS */}
              <button
                onClick={() => setActiveFilter('general')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeFilter === 'general'
                    ? isDarkMode 
                      ? 'bg-white/10 text-white font-semibold' 
                      : 'bg-slate-900 text-white font-semibold shadow-sm'
                    : isDarkMode 
                      ? 'hover:bg-white/5 text-white/50 hover:text-white' 
                      : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                General ({standardServers.length})
              </button>

              {/* VERIFIED SERVERS */}
              <button
                onClick={() => setActiveFilter('verified')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeFilter === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold'
                    : isDarkMode 
                      ? 'hover:bg-emerald-500/5 text-emerald-400' 
                      : 'hover:bg-emerald-50 text-emerald-700'
                }`}
              >
                Verified ({verifiedServers.length})
              </button>

              {/* MARKETPLACE SERVERS */}
              <button
                onClick={() => setActiveFilter('marketplace')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  activeFilter === 'marketplace'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold'
                    : isDarkMode 
                      ? 'hover:bg-purple-500/5 text-purple-400/70 hover:text-purple-300' 
                      : 'hover:bg-purple-50 text-purple-700'
                }`}
              >
                <ShoppingBag size={12} />
                Marketplace ({marketplaceServers.length})
              </button>

              {/* 18+ SERVERS */}
              <button
                onClick={() => setActiveFilter('18plus')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeFilter === '18plus'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 font-semibold'
                    : isDarkMode 
                      ? 'hover:bg-rose-500/5 text-rose-450' 
                      : 'hover:bg-rose-50 text-rose-700'
                }`}
              >
                18+ Only ({matureServers.length})
              </button>
            </div>
          </div>

          {/* Search bar row */}
          <div className="relative max-w-md w-full">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search communities by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border outline-none transition-all ${
                isDarkMode 
                  ? 'bg-white/5 border-white/5 text-white placeholder-white/30 focus:border-vylant-blue/40 focus:bg-white/10' 
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-350 focus:bg-slate-50'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                  isDarkMode ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 md:p-10 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 text-vylant-blue">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-xs font-medium tracking-wide uppercase opacity-70">Loading Discovery Hub...</p>
          </div>
        ) : error ? (
          <div className="text-center p-12 text-rose-500 text-sm border border-rose-500/10 bg-rose-500/5 rounded-2xl">
            Failed to connect: {error}
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center p-20 border border-dashed border-white/5 rounded-2xl">
            <Map size={36} className={`mx-auto mb-3 ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`} />
            <p className="text-sm text-white/40">No public communities logged</p>
          </div>
        ) : searchedServers.length === 0 ? (
          <div className="text-center p-20 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center">
            <Search size={36} className={`mb-3 ${isDarkMode ? 'text-white/25' : 'text-slate-300'}`} />
            <p className={`text-base font-semibold ${isDarkMode ? 'text-white/90' : 'text-slate-900'}`}>No communities found</p>
            <p className={`text-sm mt-1 max-w-sm ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>
              We couldn't find any public spaces matching "{searchQuery}". Try checking spelling or use different keywords.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-vylant-blue hover:bg-cyan-600 text-white transition-all shadow-sm"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* ALL FILTER VIEW */}
            {activeFilter === 'all' && (
              <>
                {discoverVerified.length > 0 && (
                  <div>
                    <h2 className={`text-xs font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                      <ShieldCheck size={14} className="text-emerald-500" />
                      Verified Communities
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {discoverVerified.map((server, index) => renderServerCard(server, index))}
                    </div>
                  </div>
                )}

                {discoverGeneral.length > 0 && (
                  <div className={`${discoverVerified.length > 0 ? 'pt-8' : ''}`}>
                    <h2 className={`text-xs font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                      <Users size={14} className="text-vylant-blue" />
                      General Communities
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {discoverGeneral.map((server, index) => renderServerCard(server, index))}
                    </div>
                  </div>
                )}

                {discoverMature.length > 0 && (
                  <div className="pt-8">
                    <h2 className={`text-xs font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                      <ShieldCheck size={14} className="text-rose-500" />
                      18+ Communities
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {discoverMature.map((server, index) => renderServerCard(server, index))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* GENERAL SERVERS VIEW */}
            {activeFilter === 'general' && (
              standardServers.length > 0 ? (
                <div>
                  <h2 className={`text-xs font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                    <Users size={14} className="text-vylant-blue" />
                    General Communities
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {standardServers.map((server, index) => renderServerCard(server, index))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-white/30 text-sm">
                  No public general servers found
                </div>
              )
            )}

            {/* 18+ SERVERS VIEW */}
            {activeFilter === '18plus' && (
              matureServers.length > 0 ? (
                <div>
                  <h2 className={`text-xs font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                    <ShieldCheck size={14} className="text-rose-500" />
                    18+ Communities
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matureServers.map((server, index) => renderServerCard(server, index))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-white/30 text-sm">
                  No restricted servers found
                </div>
              )
            )}

            {/* VERIFIED SERVERS VIEW */}
            {activeFilter === 'verified' && (
              verifiedServers.length > 0 ? (
                <div>
                  <h2 className={`text-xs font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Verified Communities
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {verifiedServers.map((server, index) => renderServerCard(server, index))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-white/30 text-sm">
                  No verified servers found
                </div>
              )
            )}

            {/* MARKETPLACE SERVERS VIEW */}
            {activeFilter === 'marketplace' && (
              marketplaceServers.length > 0 ? (
                <div>
                  <h2 className={`text-xs font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                    <ShoppingBag size={14} className="text-purple-400" />
                    Marketplace Communities ({marketplaceServers.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketplaceServers.map((server, index) => renderServerCard(server, index))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-white/30 text-sm">
                  No public servers with a marketplace found
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerDiscovery;
