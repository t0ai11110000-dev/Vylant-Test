with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad = """    const actualForcedInput = typeof forcedInput === 'string' ? forcedInput : undefined;
    const messageText = actualForcedInput !== undefined ? actualForcedInput : input;
    
    // Safety check: ensure messageText is a string before calling trim()
    if (typeof messageText !== 'string' || (!messageText.trim() && selectedAttachments.length === 0 && !forcedAudio)) return;"""

good = """    const actualForcedInput = typeof forcedInput === 'string' ? forcedInput : undefined;
    let messageText = actualForcedInput !== undefined ? actualForcedInput : input;
    
    // Safety check: ensure messageText is a string before calling trim()
    if (typeof messageText !== 'string' || (!messageText.trim() && selectedAttachments.length === 0 && !forcedAudio)) return;

    // --- Link Cleaning & Auto Moderation ---
    const urlRegex = /(https?:\/\/[^\s]+|vylant:\/\/[^\s]+|web\+vylant:\/\/[^\s]+)/g;
    let autoModBlocked = false;
    let blockedReason = '';

    if (messageText) {
      const urls = messageText.match(urlRegex) || [];
      for (const url of urls) {
        // 1. Clean link (strip tracking params if enabled)
        // analyzeSafeLink internally strips params if isStripTrackingEnabled() is true
        const analysis = analyzeSafeLink(url);
        if (analysis.cleanUrl !== url) {
          messageText = messageText.replace(url, analysis.cleanUrl);
        }

        // 2. Auto Moderation (Server only)
        if (activeView === 'servers' && activeServer) {
          const currentServer = servers.find(s => s.id === activeServer) || 
                                servers.flatMap(s => s.servers || []).find(sub => sub.id === activeServer);
          if (currentServer && currentServer.autoModEnabled) {
            if (analysis.status === 'dangerous' || analysis.status === 'suspicious') {
              autoModBlocked = true;
              blockedReason = analysis.threats.length > 0 ? analysis.threats[0] : (analysis.warnings.length > 0 ? analysis.warnings[0] : 'Suspicious link detected');
              break;
            }
          }
        }
      }
    }

    if (autoModBlocked) {
      alert(`Auto-Mod Blocked Message: Contains flagged or suspicious domains.\nReason: ${blockedReason}`);
      return;
    }
    // --- End Link Cleaning & Auto Moderation ---"""

content = content.replace(bad, good)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
