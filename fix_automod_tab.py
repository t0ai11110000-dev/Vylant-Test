with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

automod_ui = """            {activeTab === 'automod' && (
              <div className="flex flex-col gap-6 max-w-lg">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-100 text-amber-600'}`}>
                    <ShieldAlert size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Auto Moderation</h3>
                    <p className={`text-sm mt-1 leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-slate-600'}`}>
                      Protect your server members from phishing, malware, and spam. When enabled, Auto-Mod will automatically check all URLs sent in the server against a database of known threats and block messages containing dangerous links.
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex flex-col">
                    <span className="font-bold">Enable Link Filtering</span>
                    <span className={`text-xs mt-1 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                      Block malicious links and punycode spoofing before they reach the chat.
                    </span>
                  </div>
                  <button
                    onClick={() => setServerAutoModEnabled && setServerAutoModEnabled(!serverAutoModEnabled)}
                    disabled={!isOwner}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 disabled:opacity-50 ${
                      serverAutoModEnabled ? 'bg-vylant-blue' : isDarkMode ? 'bg-white/10' : 'bg-slate-200'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                      serverAutoModEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            )}
"""

content = content.replace("            {activeTab === 'overview' && (", automod_ui + "            {activeTab === 'overview' && (")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
