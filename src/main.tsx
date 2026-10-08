import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './components/AuthContext.tsx';

// Defensive prototype safety for iframe environments and React profiler property lookups
try {
  if (typeof window !== 'undefined') {
    if (typeof Window !== 'undefined' && Window.prototype && !('$$typeof' in Window.prototype)) {
      Object.defineProperty(Window.prototype, '$$typeof', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    }
    if (typeof Event !== 'undefined' && Event.prototype && !('$$typeof' in Event.prototype)) {
      Object.defineProperty(Event.prototype, '$$typeof', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    }
  }
} catch {
  // Ignore prototype configuration restrictions in hardened environments
}

window.onerror = function(message, source, lineno, colno, error) {
  const msgStr = String(message || '');
  if (msgStr.includes('SecurityError') || msgStr.includes('cross-origin frame')) {
    console.warn("Handled cross-origin environment notice:", message);
    return true; // Suppress disruptive handling for non-fatal cross-origin frame property checks
  }
  
  console.error("Global JS Error:", message, "at", source, ":", lineno, ":", colno);
  const root = document.getElementById('root');
  if (root && root.innerHTML === "") {
    root.innerHTML = `<div style="color: white; background: #1a1a2e; padding: 20px; font-family: sans-serif;">
      <h2>Something went wrong</h2>
      <p>The application failed to load. This might be due to a script error.</p>
      <pre style="background: #000; padding: 10px; overflow: auto; border-radius: 4px;">${message}</pre>
      <button onclick="location.reload()" style="background: #00d2ff; border: none; color: black; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Reload App</button>
    </div>`;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration failed: ', err);
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  });
}
