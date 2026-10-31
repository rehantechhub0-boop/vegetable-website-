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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string>('285233251337-641rhcmggf678i265umm9hf5r24befm6.apps.googleusercontent.com');
  const [loading, setLoading] = useState(false);
  const tokenClientRef = useRef<any>(null);

  const setUser = useAuthStore((s) => s.setUser);

  // 1. Fetch configured Google Client ID from backend or fallback to env
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

  // 2. Initialize Google Identity Services (GIS) & OAuth Token Client
  useEffect(() => {
    if (!clientId) return;

    let checkInterval: any = null;

    const initGoogle = () => {
      if (window.google?.accounts?.id && window.google?.accounts?.oauth2) {
        if (checkInterval) clearInterval(checkInterval);

        try {
          // Initialize ID token callback (for One-Tap and iframe button)
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              if (response?.credential) {
                await verifyTokenWithBackend({ credential: response.credential });
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Also initialize OAuth2 token client for direct popup on click
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'openid email profile',
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                console.error('Google OAuth error:', tokenResponse);
                onError?.('Google Sign-In cancelled or failed.');
                setLoading(false);
                return;
              }

              if (tokenResponse.access_token) {
                try {
                  // Fetch verified profile from Google API automatically
                  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                  });
                  const profile = await userInfoRes.json();

                  if (profile.email) {
                    await verifyTokenWithBackend({
                      email: profile.email,
                      name: profile.name || profile.given_name || profile.email.split('@')[0],
                      googleId: profile.sub,
                    });
                  } else {
                    onError?.('Could not retrieve email from Google account.');
                  }
                } catch (fetchErr) {
                  console.error('Failed to get user profile from Google:', fetchErr);
                  onError?.('Failed to fetch profile from Google.');
                } finally {
                  setLoading(false);
                }
              }
            },
          });

          // Render official button into target container if present
          if (containerRef.current) {
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
          }

          // Trigger One-Tap prompt
          window.google.accounts.id.prompt();
        } catch (err) {
          console.warn('GIS initialization error:', err);
        }
      }
    };

    checkInterval = setInterval(initGoogle, 150);
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [clientId]);

  const verifyTokenWithBackend = async (payload: { credential?: string; email?: string; name?: string; googleId?: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success && data.user) {
        if (data.token) {
          try {
            localStorage.setItem('auth_token', data.token);
          } catch {}
        }
        setUser(data.user);
        onSuccess();
      } else {
        onError?.(data.error || 'Google login verification failed.');
      }
    } catch (err) {
      onError?.('Server connection error during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  // Direct click handler: Triggers Google's real OAuth popup window
  const handleDirectGoogleSignIn = () => {
    if (tokenClientRef.current) {
      setLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      // Direct redirect to Google OAuth endpoint as fallback
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        window.location.origin + '/login'
      )}&response_type=token&scope=openid%20email%20profile`;
    }
  };

  return (
    <div className="genuine-google-wrapper" style={{ width: '100%', marginBottom: '1rem' }}>
      <button
        type="button"
        className="btn btn-outline auth-google-btn"
        onClick={handleDirectGoogleSignIn}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          height: '46px',
          borderRadius: '10px',
          border: '1.5px solid #cbd5e1',
          backgroundColor: '#ffffff',
          color: '#1e293b',
          fontSize: '0.92rem',
          fontWeight: 600,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f8fafc';
          e.currentTarget.style.borderColor = '#94a3b8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
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
        <span>{loading ? 'Connecting with Google…' : 'Continue with Google'}</span>
      </button>

      {/* Hidden target for GIS if needed */}
      <div ref={containerRef} style={{ display: 'none' }} />
    </div>
  );
};
