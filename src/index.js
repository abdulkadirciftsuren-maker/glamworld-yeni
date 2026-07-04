import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // çoklu dil sistemi (i18next) — uygulama açılışında başlar
import App from './App';
import reportWebVitals from './reportWebVitals';

// ⛔ TARAYICIYA MÜDAHALE YOK: reload YOK, cache/SW silme YOK, geçmiş tamponu YOK.
// Routing tamamen hafızada (App.js MemoryRouter) — Chrome geçmişine dokunmaz.
// Yeni sürüm otomatik gelir: hash'li dosya isimleri + index.html no-cache meta.

// UYGULAMAYI YÜKLE (PWA "Ana ekrana ekle"): tarayıcı hazır olunca beforeinstallprompt tetiklenir —
// olayı ERKEN yakalayıp sakla ki Davet penceresindeki "Uygulamayı yükle" düğmesi çalışsın.
try {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__groxKurPrompt = e;
    try { window.dispatchEvent(new Event('grox-kurulabilir')); } catch (x) {}
  });
  window.addEventListener('appinstalled', () => {
    window.__groxKurPrompt = null;
    try { window.dispatchEvent(new Event('grox-kurulabilir')); } catch (x) {}
  });
} catch (x) {}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
reportWebVitals();
