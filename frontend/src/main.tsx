import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── GLOBAL FETCH INTERCEPTOR ──────────────────────────────────────────
// Handles cross-origin Hostinger/Cloudflare routing, JWT Bearer token
// injection, and automatic session persistence.
const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let targetUrl: RequestInfo | URL = input;
  const inputStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : '';

  const isApiCall =
    inputStr.startsWith('/api') ||
    inputStr.startsWith('/uploads') ||
    (apiBase && inputStr.startsWith(apiBase));

  if (apiBase) {
    if (typeof input === 'string') {
      if (input.startsWith('/api') || input.startsWith('/uploads')) {
        targetUrl = `${apiBase}${input}`;
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api') || input.pathname.startsWith('/uploads')) {
        targetUrl = `${apiBase}${input.pathname}${input.search}`;
      }
    }
  }

  // Clone options and ensure credentials
  const options: RequestInit = { ...(init || {}) };
  options.credentials = 'include';

  // Inject Authorization Bearer token from localStorage for all API calls
  if (isApiCall) {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const headers = new Headers(options.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        options.headers = headers;
      }
    } catch {}
  }

  const response = await originalFetch(targetUrl, options);

  // Auto-capture token from auth responses and persist
  if (isApiCall) {
    try {
      const cloned = response.clone();
      cloned.json().then((data) => {
        if (data?.token && typeof data.token === 'string') {
          localStorage.setItem('auth_token', data.token);
        }
      }).catch(() => {});
    } catch {}
  }

  return response;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
