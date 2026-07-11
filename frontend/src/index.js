import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Service Worker ro'yxatdan o'tkazish
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Yangi versiya chiqqanda foydalanuvchiga xabar berish
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Yangi versiya mavjud — reload qilish
              if (window.confirm("Yangi versiya mavjud! Yangilash uchun OK bosing.")) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((err) => console.warn('SW ro\'yxatdan o\'tmadi:', err));
  });
}

// Online/Offline holat kuzatish
function showOfflineBanner(show) {
  let banner = document.getElementById('offline-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: #f59e0b; color: #000; text-align: center;
      padding: 8px 16px; font-size: 13px; font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transform: translateY(-100%); transition: transform 0.3s ease;
    `;
    document.body.appendChild(banner);
  }
  if (show) {
    banner.textContent = '⚠️ Internet ulanishi yo\'q — offline rejimda ishlayapsiz';
    banner.style.transform = 'translateY(0)';
  } else {
    banner.textContent = '✅ Internet ulanishi tiklandi!';
    banner.style.background = '#10b981';
    banner.style.color = '#fff';
    banner.style.transform = 'translateY(0)';
    setTimeout(() => { banner.style.transform = 'translateY(-100%)'; }, 2500);
  }
}

window.addEventListener('offline', () => showOfflineBanner(true));
window.addEventListener('online', () => showOfflineBanner(false));
if (!navigator.onLine) showOfflineBanner(true);