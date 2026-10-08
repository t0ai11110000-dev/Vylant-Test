// Download and installation helpers for Mac, iOS, Android, Linux, and Windows

export type PlatformId = 'mac' | 'ios' | 'android' | 'linux' | 'windows';

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  shortName: string;
  badge: string;
  iconName: string;
  tagline: string;
  formats: string[];
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'mac',
    name: 'macOS (Mac)',
    shortName: 'Mac',
    badge: 'Apple Silicon & Intel',
    iconName: 'Apple',
    tagline: 'Native standalone app bundle, .command installer & Safari Add to Dock',
    formats: ['.command Installer', '.webloc Shortcut', 'Safari Web App']
  },
  {
    id: 'windows',
    name: 'Windows',
    shortName: 'Windows',
    badge: 'Windows 10 / 11',
    iconName: 'Laptop',
    tagline: 'Standalone App Launcher (.bat) & Desktop .url shortcut',
    formats: ['.bat App Launcher', '.url Shortcut']
  },
  {
    id: 'linux',
    name: 'Linux',
    shortName: 'Linux',
    badge: 'Ubuntu, Fedora, Arch & more',
    iconName: 'Terminal',
    tagline: 'XDG Desktop Entry (.desktop), bash auto-installer & terminal 1-liner',
    formats: ['.desktop Entry', 'Bash Installer .sh', 'Terminal 1-Liner']
  },
  {
    id: 'ios',
    name: 'iOS (iPhone & iPad)',
    shortName: 'iOS',
    badge: 'iPhone & iPad',
    iconName: 'Smartphone',
    tagline: 'Apple WebClip Profile (.mobileconfig) & 1-tap Home Screen setup',
    formats: ['.mobileconfig Profile', 'Home Screen WebClip', 'QR Quick Scan']
  },
  {
    id: 'android',
    name: 'Android',
    shortName: 'Android',
    badge: 'Phones & Tablets',
    iconName: 'Bot',
    tagline: '1-Tap WebAPK PWA install, Android launcher helper & full notifications',
    formats: ['1-Tap PWA WebAPK', 'Android Helper HTML', 'QR Quick Scan']
  }
];

export const detectUserPlatform = (): PlatformId => {
  if (typeof window === 'undefined') return 'windows';
  
  // 1. Check navigator.userAgentData if available (modern browsers)
  // @ts-ignore
  const userAgentDataPlatform = navigator.userAgentData?.platform?.toLowerCase();
  if (userAgentDataPlatform) {
    if (userAgentDataPlatform.includes('mac')) return 'mac';
    if (userAgentDataPlatform.includes('win')) return 'windows';
    if (userAgentDataPlatform.includes('android')) return 'android';
    if (userAgentDataPlatform.includes('linux')) return 'linux';
    if (userAgentDataPlatform.includes('ios')) return 'ios';
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  // 2. Check iOS (iPhone, iPad, iPod, iPadOS on MacIntel)
  const isIOS = /iPad|iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';

  // 3. Check Android
  if (/Android/i.test(ua)) return 'android';

  // 4. Check macOS
  if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(platform) || /Mac OS X/i.test(ua)) return 'mac';

  // 5. Check Windows
  if (/Win32|Win64|Windows|WinCE/i.test(platform) || /Windows NT/i.test(ua)) return 'windows';

  // 6. Check Linux
  if (/Linux|X11/i.test(platform) || /Linux/i.test(ua)) return 'linux';

  // Fallback
  return 'windows';
};

export const getPlatformDisplayName = (platform: PlatformId): string => {
  switch (platform) {
    case 'mac': return 'macOS';
    case 'windows': return 'Windows';
    case 'linux': return 'Linux';
    case 'ios': return 'iOS';
    case 'android': return 'Android';
    default: return 'Desktop';
  }
};

export const getPlatformDownloadLabel = (platform: PlatformId = detectUserPlatform()): string => {
  return 'Download';
};

export interface SystemDownloadInfo {
  platformId: PlatformId;
  name: string;
  shortName: string;
  badge: string;
  buttonLabel: string;
  downloadFilename: string;
  primaryAction: string;
  fileFormat: string;
  tagline: string;
}

export const getSystemSpecificDownloadInfo = (platform: PlatformId = detectUserPlatform()): SystemDownloadInfo => {
  switch (platform) {
    case 'mac':
      return {
        platformId: 'mac',
        name: 'macOS (Mac)',
        shortName: 'Mac',
        badge: 'Apple Silicon & Intel',
        buttonLabel: 'Download for macOS',
        downloadFilename: 'Vylant-macOS-Installer.command',
        primaryAction: 'Download App',
        fileFormat: '.command Installer',
        tagline: 'Native standalone app bundle, .command installer & Safari Add to Dock'
      };
    case 'windows':
      return {
        platformId: 'windows',
        name: 'Windows',
        shortName: 'Windows',
        badge: 'Windows 10 / 11',
        buttonLabel: 'Download for Windows',
        downloadFilename: 'Vylant.bat',
        primaryAction: 'Download App',
        fileFormat: '.bat Standalone App',
        tagline: 'Standalone App Launcher (.bat) & Desktop .url shortcut'
      };
    case 'linux':
      return {
        platformId: 'linux',
        name: 'Linux',
        shortName: 'Linux',
        badge: 'Ubuntu, Fedora, Arch, Debian',
        buttonLabel: 'Download for Linux',
        downloadFilename: 'vylant-linux-installer.sh',
        primaryAction: 'Download App',
        fileFormat: '.sh Installer',
        tagline: 'XDG Desktop Entry (.desktop), bash auto-installer & terminal 1-liner'
      };
    case 'ios':
      return {
        platformId: 'ios',
        name: 'iOS (iPhone & iPad)',
        shortName: 'iOS',
        badge: 'iOS 14+',
        buttonLabel: 'Download for iOS',
        downloadFilename: 'Vylant.mobileconfig',
        primaryAction: 'Download App',
        fileFormat: '.mobileconfig Profile',
        tagline: 'Apple WebClip Profile (.mobileconfig) & 1-tap Home Screen setup'
      };
    case 'android':
      return {
        platformId: 'android',
        name: 'Android',
        shortName: 'Android',
        badge: 'Android 8+',
        buttonLabel: 'Download for Android',
        downloadFilename: 'Vylant-Android-Install.html',
        primaryAction: 'Download App',
        fileFormat: 'WebAPK / Standalone HTML',
        tagline: '1-Tap WebAPK PWA install, Android launcher helper & full notifications'
      };
  }
};

const getAppUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin || window.location.href;
  }
  return 'https://vylant.net';
};

const ICON_URL = 'https://i.imgur.com/H3OS5zA.png';

// Trigger file download helper
export const triggerFileDownload = (content: string, filename: string, mimeType: string) => {
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 2000);
  } catch (err) {
    console.error('File download helper error:', err);
  }
};

// ==================== macOS DOWNLOADS ====================
export const generateMacInstallerScript = (appUrl: string = getAppUrl()) => {
  return `#!/bin/bash
# ==============================================================================
#                 Vylant macOS Desktop App Setup & Launcher
#      Compatible with macOS Sonoma, Sequoia, Ventura, Monterey & Big Sur
#      Supports Apple Silicon (M1/M2/M3/M4) & Intel Core Mac architectures
# ==============================================================================

clear
echo "======================================================================"
echo "                    Vylant macOS App Installer                        "
echo "======================================================================"
echo ""

APP_URL="${appUrl}"
ICON_URL="${ICON_URL}"
APP_NAME="Vylant"
APP_DIR="$HOME/Applications/$APP_NAME.app"
DESKTOP_DIR="$HOME/Desktop"

echo "[1/4] Preparing macOS Application Bundle at ~/Applications/$APP_NAME.app..."
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

echo "[2/4] Downloading high-resolution Vylant app icon..."
curl -s -L "$ICON_URL" -o "$APP_DIR/Contents/Resources/icon.png" 2>/dev/null || wget -q "$ICON_URL" -O "$APP_DIR/Contents/Resources/icon.png" 2>/dev/null

echo "[3/4] Creating native standalone launch script..."
cat << 'EOF' > "$APP_DIR/Contents/MacOS/Vylant"
#!/bin/bash
URL="\${APP_URL}"

# Priority 1: Google Chrome Standalone Window Mode
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$URL"
# Priority 2: Brave Browser Standalone Window Mode
elif [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args --app="$URL"
# Priority 3: Microsoft Edge Standalone Window Mode
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="$URL"
# Priority 4: Chromium
elif [ -d "/Applications/Chromium.app" ]; then
    open -na "Chromium" --args --app="$URL"
# Priority 5: Default System Browser (Safari)
else
    open "$URL"
fi
EOF

chmod +x "$APP_DIR/Contents/MacOS/Vylant"

cat << EOF > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Vylant</string>
    <key>CFBundleIconFile</key>
    <string>icon.png</string>
    <key>CFBundleIdentifier</key>
    <string>net.vylant.app</string>
    <key>CFBundleName</key>
    <string>Vylant</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "[4/4] Creating Desktop Shortcut..."
if [ -d "$DESKTOP_DIR" ]; then
    ln -sf "$APP_DIR" "$DESKTOP_DIR/$APP_NAME.app"
fi

# Refresh LaunchServices
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_DIR" 2>/dev/null || true

echo ""
echo "======================================================================"
echo " [✓] Vylant Desktop App installed successfully on your Mac!"
echo "     • Installed to: ~/Applications/Vylant.app"
echo "     • Desktop Shortcut created: ~/Desktop/Vylant.app"
echo "     • You can also open Vylant from Spotlight Search (Cmd + Space)"
echo "======================================================================"
echo ""
echo "Launching Vylant..."
open "$APP_DIR"
`;
};

export const generateMacWebloc = (appUrl: string = getAppUrl()) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>URL</key>
	<string>${appUrl}</string>
</dict>
</plist>`;
};

// ==================== iOS DOWNLOADS ====================
export const generateIOSMobileConfig = (appUrl: string = getAppUrl()) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>Vylant</string>
			<key>PayloadDescription</key>
			<string>Installs the official Vylant Standalone Web App onto your iOS Home Screen.</string>
			<key>PayloadDisplayName</key>
			<string>Vylant</string>
			<key>PayloadIdentifier</key>
			<string>net.vylant.ios.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>4B8380BC-3AE7-48DF-928A-5BCF8E7E0824</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>${appUrl}</string>
		</dict>
	</array>
	<key>PayloadDescription</key>
	<string>Vylant High-Fidelity Communication Platform for iPhone &amp; iPad</string>
	<key>PayloadDisplayName</key>
	<string>Vylant App</string>
	<key>PayloadIdentifier</key>
	<string>net.vylant.ios.profile</string>
	<key>PayloadOrganization</key>
	<string>Vylant</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>E713E537-88D8-46E0-B77D-A2A9D48A14EB</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;
};

// ==================== LINUX DOWNLOADS ====================
export const generateLinuxInstallerScript = (appUrl: string = getAppUrl()) => {
  return `#!/bin/bash
# ==============================================================================
#                 Vylant Linux Desktop App Setup & Installer
#      Compatible with Ubuntu, Debian, Fedora, Arch Linux, Manjaro, Pop!_OS,
#      Linux Mint, openSUSE, and any XDG-compliant desktop environment.
# ==============================================================================

set -e
clear
echo "======================================================================"
echo "                   Vylant Linux Desktop App Setup                     "
echo "======================================================================"
echo ""

APP_URL="${appUrl}"
ICON_URL="${ICON_URL}"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICONS_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
DESKTOP_USER="$HOME/Desktop"

echo "[1/4] Creating local XDG app directories..."
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICONS_DIR"
mkdir -p "$HOME/.local/share/icons"

echo "[2/4] Downloading high-resolution Vylant icon..."
if command -v curl &> /dev/null; then
    curl -s -L "$ICON_URL" -o "$ICONS_DIR/vylant.png" 2>/dev/null || true
elif command -v wget &> /dev/null; then
    wget -q "$ICON_URL" -O "$ICONS_DIR/vylant.png" 2>/dev/null || true
fi
cp -f "$ICONS_DIR/vylant.png" "$HOME/.local/share/icons/vylant.png" 2>/dev/null || true

echo "[3/4] Creating launcher binary ($BIN_DIR/vylant)..."
cat << 'EOF' > "$BIN_DIR/vylant"
#!/bin/bash
URL="\${APP_URL}"

# Priority 1: Google Chrome Standalone Window
if command -v google-chrome &> /dev/null; then
    google-chrome --app="$URL" "$@" &
# Priority 2: Brave Browser
elif command -v brave-browser &> /dev/null; then
    brave-browser --app="$URL" "$@" &
# Priority 3: Chromium
elif command -v chromium &> /dev/null; then
    chromium --app="$URL" "$@" &
elif command -v chromium-browser &> /dev/null; then
    chromium-browser --app="$URL" "$@" &
# Priority 4: Microsoft Edge
elif command -v microsoft-edge &> /dev/null; then
    microsoft-edge --app="$URL" "$@" &
# Priority 5: Firefox standalone window
elif command -v firefox &> /dev/null; then
    firefox --new-window "$URL" "$@" &
# Priority 6: Default XDG opener
elif command -v xdg-open &> /dev/null; then
    xdg-open "$URL" &
else
    echo "Open $URL in your browser."
fi
EOF

chmod +x "$BIN_DIR/vylant"

echo "[4/4] Creating Desktop Entry ($DESKTOP_DIR/vylant.desktop)..."
cat << EOF > "$DESKTOP_DIR/vylant.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=Vylant
GenericName=Chat & Communication Platform
Comment=Vylant High-Fidelity Communication Platform
Exec=$BIN_DIR/vylant %u
Icon=vylant
Terminal=false
Categories=Network;InstantMessaging;Chat;AudioVideo;
Keywords=vylant;chat;messaging;voice;call;community;
StartupWMClass=vylant
StartupNotify=true
MimeType=x-scheme-handler/vylant;
EOF

chmod +x "$DESKTOP_DIR/vylant.desktop"

# Copy to user Desktop folder if present
if [ -d "$DESKTOP_USER" ]; then
    cp -f "$DESKTOP_DIR/vylant.desktop" "$DESKTOP_USER/vylant.desktop"
    chmod +x "$DESKTOP_USER/vylant.desktop" 2>/dev/null || true
    if command -v gio &> /dev/null; then
        gio set "$DESKTOP_USER/vylant.desktop" metadata::trusted true 2>/dev/null || true
    fi
fi

# Update desktop application database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo ""
echo "======================================================================"
echo " [✓] Vylant Desktop App has been installed on Linux!"
echo "     • Launcher Binary: $BIN_DIR/vylant"
echo "     • Desktop Entry:   $DESKTOP_DIR/vylant.desktop"
echo "     • You can now launch Vylant from your Application Launcher / Menu!"
echo "======================================================================"
echo ""
echo "Launching Vylant..."
"$BIN_DIR/vylant" &
`;
};

export const generateLinuxDesktopEntry = (appUrl: string = getAppUrl()) => {
  return `[Desktop Entry]
Version=1.0
Type=Application
Name=Vylant
GenericName=Chat & Communication Platform
Comment=Vylant High-Fidelity Communication Platform
Exec=xdg-open "${appUrl}"
Icon=${ICON_URL}
Terminal=false
Categories=Network;InstantMessaging;Chat;AudioVideo;
Keywords=vylant;chat;messaging;voice;call;community;
StartupWMClass=vylant
`;
};

// ==================== ANDROID DOWNLOADS ====================
export const generateAndroidHelperHtml = (appUrl: string = getAppUrl()) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install Vylant on Android</title>
  <link rel="icon" href="${ICON_URL}">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0b0e14;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #151923;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 28px;
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 22px;
      border: 2px solid #00c3ff;
      margin-bottom: 16px;
      box-shadow: 0 0 20px rgba(0,195,255,0.3);
    }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      background: #00c3ff;
      color: #000;
      font-weight: 700;
      font-size: 16px;
      border-radius: 16px;
      text-decoration: none;
      margin-bottom: 12px;
      box-shadow: 0 4px 15px rgba(0,195,255,0.4);
    }
    .btn-secondary {
      background: rgba(255,255,255,0.08);
      color: #fff;
      box-shadow: none;
    }
    .steps {
      text-align: left;
      background: rgba(255,255,255,0.04);
      padding: 16px;
      border-radius: 16px;
      margin-top: 20px;
      font-size: 13px;
    }
    .steps ol { padding-left: 20px; }
    .steps li { margin-bottom: 8px; color: #cbd5e1; }
    .steps strong { color: #00c3ff; }
  </style>
</head>
<body>
  <div class="card">
    <img src="${ICON_URL}" alt="Vylant Logo" class="logo">
    <h1>Install Vylant App</h1>
    <p>Get full screen speed, instant push notifications, and quick home screen access on Android.</p>
    
    <a href="${appUrl}" class="btn" id="launchBtn">🚀 Open &amp; Install Vylant</a>
    
    <div class="steps">
      <div style="font-weight: bold; margin-bottom: 8px; color: #fff;">How to Install in Chrome / Android:</div>
      <ol>
        <li>Tap <strong>Open &amp; Install</strong> above.</li>
        <li>Tap the <strong>⋮ (three dots)</strong> menu in the top right.</li>
        <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
        <li>Confirm by tapping <strong>Install</strong>.</li>
      </ol>
    </div>
  </div>
</body>
</html>`;
};

// ==================== WINDOWS DOWNLOADS ====================
export const generateWindowsBat = (appUrl: string = getAppUrl()) => {
  return `@echo off
title Vylant Launcher Setup
echo ======================================================
echo          Vylant Standalone Desktop App Setup
echo ======================================================
echo.

set "APP_URL=${appUrl}"
set "ICON_URL=${ICON_URL}"
set "DESKTOP_DIR=%USERPROFILE%\\Desktop"
set "APP_DIR=%LOCALAPPDATA%\\VylantApp"
set "ICON_PATH=%APP_DIR%\\vylant_logo.png"
set "SHORTCUT_PATH=%DESKTOP_DIR%\\Vylant.url"

if not exist "%APP_DIR%" mkdir "%APP_DIR%"

echo [1/2] Downloading high-resolution Vylant icon...
powershell -Command "try { (New-Object System.Net.WebClient).DownloadFile('%ICON_URL%', '%ICON_PATH%') } catch {}" 2>nul

echo [2/2] Creating Vylant Desktop Shortcut...
echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=%APP_URL% >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"
if exist "%ICON_PATH%" (
  echo IconFile=%ICON_PATH% >> "%SHORTCUT_PATH%"
)

echo.
echo ======================================================
echo  [!] Vylant Desktop Shortcut created successfully!
echo  [!] Launching Vylant in Standalone Window mode...
echo ======================================================
echo.

start "" chrome --app="%APP_URL%" 2>nul || start "" brave --app="%APP_URL%" 2>nul || start "" msedge --app="%APP_URL%" 2>nul || start "" "%APP_URL%"

exit
`;
};

export const generateWindowsUrlShortcut = (appUrl: string = getAppUrl()) => {
  return `[InternetShortcut]
URL=${appUrl}
IconIndex=0
IconFile=${ICON_URL}
`;
};
