export interface SafeLinkAnalysis {
  originalUrl: string;
  cleanUrl: string;
  hostname: string;
  protocol: string;
  pathname: string;
  status: 'safe' | 'verified' | 'suspicious' | 'dangerous';
  safetyScore: number; // 0 to 100
  threats: string[];
  warnings: string[];
  strippedParams: string[];
  strippedParamCount: number;
  isTrusted: boolean;
  isIpAddress: boolean;
  hasSuspiciousExtension: boolean;
  hasSuspiciousTld: boolean;
  hasHomoglyphs: boolean;
}

const DEFAULT_TRUSTED_DOMAINS = [
  'vylant.app',
  'github.com',
  'youtube.com',
  'youtu.be',
  'google.com',
  'wikipedia.org',
  'twitter.com',
  'x.com',
  'reddit.com',
  'twitch.tv',
  'spotify.com',
  'apple.com',
  'microsoft.com',
  'steamcommunity.com',
  'steampowered.com',
  'tenor.com',
  'giphy.com',
  'imgur.com',
  'gitlab.com',
  'stackoverflow.com',
  'discord.com',
  'discord.gg'
];

const TRACKING_PARAM_PREFIXES = [
  'utm_',
  'ga_',
  'gclid',
  'fbclid',
  'msclkid',
  'mc_eid',
  'mc_cid',
  '_hsenc',
  '_hsmi',
  'igshid',
  'yclid',
  'twclid',
  'ttclid',
  'dclid',
  'sc_src',
  'sc_lid',
  'sc_llid',
  'sc_customer',
  'wickedid',
  'zanpid',
  'wbraid',
  'gbraid',
  'mkt_tok',
  'vero_id',
  'vero_conv',
  'trk',
  'trk_msg',
  'ref_src',
  'ref_url',
  'source',
  'campaign'
];

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.vbe',
  '.js', '.jse', '.wsf', '.wsh', '.msc', '.msi', '.msp', '.reg',
  '.apk', '.jar', '.ps1', '.iso', '.dmg', '.pkg', '.hta'
];

const SUSPICIOUS_KEYWORDS = [
  'free-nitro', 'discord-gift', 'steam-gift', 'free-crypto', 'claim-airdrop',
  'login-verify', 'account-security-alert', 'verify-wallet', 'metamask-restore',
  'free-robux', 'vbucks-gen', 'pass-reset-auth'
];

const SUSPICIOUS_TLDS = [
  '.zip', '.mov', '.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.work', '.click', '.link', '.surf'
];

export function getTrustedDomains(): string[] {
  try {
    const saved = localStorage.getItem('vylant_safelink_trusted_domains');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return Array.from(new Set([...DEFAULT_TRUSTED_DOMAINS, ...parsed]));
      }
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_TRUSTED_DOMAINS;
}

export function addTrustedDomain(domain: string): string[] {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!clean) return getTrustedDomains();
  const current = getTrustedDomains();
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    try {
      localStorage.setItem('vylant_safelink_trusted_domains', JSON.stringify(updated));
    } catch (e) {}
    return updated;
  }
  return current;
}

export function removeTrustedDomain(domain: string): string[] {
  const clean = domain.trim().toLowerCase();
  const current = getTrustedDomains();
  const updated = current.filter(d => d !== clean);
  try {
    localStorage.setItem('vylant_safelink_trusted_domains', JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function isSafeLinkEnabled(): boolean {
  try {
    const val = localStorage.getItem('vylant_safelink_enabled');
    return val !== 'false'; // Enabled by default
  } catch (e) {
    return true;
  }
}

export function setSafeLinkEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('vylant_safelink_enabled', String(enabled));
  } catch (e) {}
}

export function isStripTrackingEnabled(): boolean {
  try {
    const val = localStorage.getItem('vylant_safelink_strip_tracking');
    return val !== 'false'; // Enabled by default
  } catch (e) {
    return true;
  }
}

export function setStripTrackingEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('vylant_safelink_strip_tracking', String(enabled));
  } catch (e) {}
}

export function isDomainTrusted(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const trusted = getTrustedDomains();
  return trusted.some(t => host === t || host.endsWith('.' + t));
}

export function stripTrackingParams(rawUrl: string): { cleanUrl: string; strippedParams: string[] } {
  try {
    const url = new URL(rawUrl);
    const strippedParams: string[] = [];
    const paramsToDelete: string[] = [];

    url.searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      const isTracking = TRACKING_PARAM_PREFIXES.some(prefix => 
        lowerKey === prefix || lowerKey.startsWith(prefix)
      );
      if (isTracking) {
        strippedParams.push(key);
        paramsToDelete.push(key);
      }
    });

    paramsToDelete.forEach(p => url.searchParams.delete(p));
    return {
      cleanUrl: url.toString(),
      strippedParams
    };
  } catch (e) {
    return {
      cleanUrl: rawUrl,
      strippedParams: []
    };
  }
}

export function analyzeSafeLink(rawUrl: string): SafeLinkAnalysis {
  const threats: string[] = [];
  const warnings: string[] = [];
  let safetyScore = 100;
  let hostname = '';
  let protocol = '';
  let pathname = '';
  let cleanUrl = rawUrl;
  let strippedParams: string[] = [];

  const shouldStrip = isStripTrackingEnabled();
  if (shouldStrip) {
    const stripped = stripTrackingParams(rawUrl);
    cleanUrl = stripped.cleanUrl;
    strippedParams = stripped.strippedParams;
  }

  try {
    // Normalization check
    let parsedUrl: URL;
    if (rawUrl.startsWith('//')) {
      parsedUrl = new URL('https:' + rawUrl);
    } else if (!rawUrl.includes('://')) {
      parsedUrl = new URL('https://' + rawUrl);
    } else {
      parsedUrl = new URL(rawUrl);
    }

    hostname = parsedUrl.hostname.toLowerCase();
    protocol = parsedUrl.protocol.toLowerCase();
    pathname = parsedUrl.pathname.toLowerCase();

    // 1. Dangerous Protocols
    if (['javascript:', 'data:', 'vbscript:', 'file:', 'blob:'].includes(protocol)) {
      threats.push(`Dangerous execution protocol detected: ${protocol}`);
      safetyScore -= 80;
    }

    // 2. Non-HTTPS Warning
    if (protocol === 'http:') {
      warnings.push('Unencrypted connection (HTTP). Information sent may not be private.');
      safetyScore -= 15;
    }

    // 3. Direct IP Address detection
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.startsWith('[') || /^[0-9a-f:]+$/i.test(hostname);
    if (isIp) {
      warnings.push(`Direct IP address host (${hostname}) instead of registered domain.`);
      safetyScore -= 30;
    }

    // 4. Executable / dangerous file download extensions
    const hasDangerousExt = DANGEROUS_EXTENSIONS.some(ext => 
      pathname.endsWith(ext) || parsedUrl.search.toLowerCase().includes(ext)
    );
    if (hasDangerousExt) {
      threats.push('Link targets or contains an executable file extension (potential malware).');
      safetyScore -= 50;
    }

    // 5. Homoglyphs and Punycode (IDN spoofing)
    const isPunycode = hostname.startsWith('xn--') || hostname.includes('.xn--');
    const hasNonAscii = /[^\u0000-\u007F]/.test(hostname);
    if (isPunycode || hasNonAscii) {
      warnings.push('Internationalized domain name (Punycode/Homoglyph) detected. May be a lookalike spoof.');
      safetyScore -= 25;
    }

    // 6. Suspicious Phishing Keywords in URL
    const fullLower = parsedUrl.toString().toLowerCase();
    const foundKeywords = SUSPICIOUS_KEYWORDS.filter(kw => fullLower.includes(kw));
    if (foundKeywords.length > 0) {
      threats.push(`Contains high-risk phishing keywords: ${foundKeywords.join(', ')}`);
      safetyScore -= 40;
    }

    // 7. Suspicious TLD check
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some(tld => hostname.endsWith(tld));
    if (hasSuspiciousTld) {
      warnings.push('Uses a high-risk or commonly abused Top-Level Domain (TLD).');
      safetyScore -= 20;
    }

    // 8. Excessive Subdomains
    const subdomainParts = hostname.split('.');
    if (subdomainParts.length > 4) {
      warnings.push('Excessive number of subdomains (common in redirection / evasion attacks).');
      safetyScore -= 15;
    }

    // 9. Whitelist check
    const isTrusted = isDomainTrusted(hostname);
    if (isTrusted && threats.length === 0) {
      safetyScore = Math.max(95, safetyScore);
    }

    safetyScore = Math.max(0, Math.min(100, safetyScore));

    let status: 'safe' | 'verified' | 'suspicious' | 'dangerous' = 'safe';
    if (threats.length > 0 || safetyScore < 45) {
      status = 'dangerous';
    } else if (warnings.length > 0 || safetyScore < 75) {
      status = 'suspicious';
    } else if (isTrusted) {
      status = 'verified';
    }

    return {
      originalUrl: rawUrl,
      cleanUrl,
      hostname: hostname || 'unknown',
      protocol: protocol || 'https:',
      pathname: pathname || '/',
      status,
      safetyScore,
      threats,
      warnings,
      strippedParams,
      strippedParamCount: strippedParams.length,
      isTrusted,
      isIpAddress: isIp,
      hasSuspiciousExtension: hasDangerousExt,
      hasSuspiciousTld,
      hasHomoglyphs: isPunycode || hasNonAscii
    };
  } catch (err) {
    return {
      originalUrl: rawUrl,
      cleanUrl: rawUrl,
      hostname: 'invalid-url',
      protocol: 'unknown',
      pathname: '',
      status: 'dangerous',
      safetyScore: 10,
      threats: ['Malformed or invalid URL structure'],
      warnings: [],
      strippedParams: [],
      strippedParamCount: 0,
      isTrusted: false,
      isIpAddress: false,
      hasSuspiciousExtension: false,
      hasSuspiciousTld: false,
      hasHomoglyphs: false
    };
  }
}
