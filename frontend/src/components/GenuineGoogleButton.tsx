import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';

declare global {
  interface Window {
    google?: any;
  }
}

interface GenuineGoogleButtonProps {
  onSuccess: () => void;
  onError?: (msg: string) => void;
  onOpenFallbackModal?: () => void;
}

export const GenuineGoogleButton: React.FC<GenuineGoogleButtonProps> = ({
  onSuccess,
  onError,
  onOpenFallbackModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isGsiRendered, setIsGsiRendered] = useState(false);

  const setUser = useAuthStore((s) => s.setUser);

  // 1. Fetch configured Google Client ID from backend
  useEffect(() => {
    let isMounted = true;

    async function checkGoogleConfig() {
      try {
        const res = await fetch('/api/v1/auth/google/config');
        const data = await res.json();
        const viteClient = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
        if (isMounted) {
          if (data.success && data.clientId) {
            setClientId(data.clientId);
          } else if (viteClient) {
            setClientId(viteClient);
          }
        }
      } catch (e) {
        console.warn('Failed to load Google OAuth config from server:', e);
      }
    }

    checkGoogleConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize official Google Identity Services (GIS) when clientId and SDK are available
  useEffect(() => {
    if (!clientId || clientId.length < 10) return;

    const interval = setInterval(() => {
      if (window.google?.accounts?.id && containerRef.current) {
        clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              if (!response?.credential) {
                onError?.('Google did not return an identity token.');
                return;
              }

              try {
                const res = await fetch('/api/v1/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ credential: response.credential }),
                  credentials: 'include',
                });

                const data = await res.json();
                if (data.success && data.user) {
                  setUser(data.user);
                  onSuccess();
                } else {
                  onError?.(data.error || 'Google token verification failed.');
                }
              } catch (err: any) {
                onError?.('Server connection failed while verifying Google token.');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official Google branded iframe button
          containerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(containerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
          });

          // Prompt Google One-Tap
          window.google.accounts.id.prompt();
          setIsGsiRendered(true);
        } catch (initErr) {
          console.warn('Google Identity Services initialization warning:', initErr);
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [clientId, onSuccess, onError, setUser]);

  return (
    <div className="genuine-google-wrapper">
      {/* Official Google Identity Services Button */}
      <div
        ref={containerRef}
        className={`genuine-google-render-target ${isGsiRendered ? 'visible' : 'hidden'}`}
      />

      {/* Styled button when Google iframe is loading */}
      {!isGsiRendered && (
        <button
          type="button"
          className="btn btn-outline auth-google-btn genuine-btn-style"
          onClick={onOpenFallbackModal}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}
    </div>
  );
};
