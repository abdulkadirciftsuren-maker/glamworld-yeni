import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // çoklu dil sistemi (i18next) — uygulama açılışında başlar
import App from './App';
import reportWebVitals from './reportWebVitals';

// ⛔ TARAYICIYA MÜDAHALE YOK: reload YOK, cache/SW silme YOK, geçmiş tamponu YOK.
// Routing tamamen hafızada (App.js MemoryRouter) — Chrome geçmişine dokunmaz.
// Yeni sürüm otomatik gelir: hash'li dosya isimleri + index.html no-cache meta.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
reportWebVitals();
