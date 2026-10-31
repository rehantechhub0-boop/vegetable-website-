import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Route relative API and uploads calls to VITE_API_URL if configured
const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
if (apiBase) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      if (input.startsWith('/api') || input.startsWith('/uploads')) {
        return originalFetch(`${apiBase}${input}`, init);
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api') || input.pathname.startsWith('/uploads')) {
        return originalFetch(`${apiBase}${input.pathname}${input.search}`, init);
      }
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
