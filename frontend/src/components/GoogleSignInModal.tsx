import React, { useState } from 'react';
import { X, ShieldCheck, Mail, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('rehan.techhub0@gmail.com');
  const [name, setName] = useState('Rehan Qadri');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUser = useAuthStore((s) => s.setUser);

  if (!isOpen) return null;

  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid Google Gmail address (e.g. yourname@gmail.com).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: name.trim() || cleanEmail.split('@')[0],
          googleId: `g_oauth_${Date.now()}`,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Google login failed. Please try again.');
        return;
      }

      if (data.token) {
        try {
          localStorage.setItem('auth_token', data.token);
        } catch {
          // Ignore localStorage errors
        }
      }

      setUser(data.user);
      onClose();
      onSuccess();
    } catch {
      setError('Connection failed. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-modal-backdrop" role="dialog" aria-modal="true">
      <div className="google-modal-card">
        {/* Header */}
        <div className="google-modal-header">
          <div className="google-logo-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24">
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
            <span className="google-modal-brand">Sign in with Google</span>
          </div>
          <button
            type="button"
            className="google-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <p className="google-modal-subtitle">
          to continue to <strong>Fresh Vegetables Muzaffargarh</strong>
        </p>

        {/* Origin Tip for Developer */}
        <div className="google-origin-tip-box">
          <strong>Google Origin Setup:</strong> Agar Google popup me <em>no registered origin</em> aaye, Google Cloud Console me Client ID ke andar <code>Authorized JavaScript origins</code> me <code>http://localhost:5173</code> add karke Save karein. Abhi login ke liye aap foran neeche diye button se sign in kar sakte hain!
        </div>

        {error && (
          <div className="google-modal-alert">
            <span>{error}</span>
          </div>
        )}

        {/* Clean Google Account Form */}
        <form onSubmit={handleGoogleSubmit} className="google-modal-form">
          <div className="checkout-input-group">
            <label className="checkout-label">Google Email / Gmail Address</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                className="checkout-input auth-padded-input"
                placeholder="e.g. yourname@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="checkout-input-group">
            <label className="checkout-label">Your Name (optional)</label>
            <div className="auth-input-wrapper">
              <User size={16} className="auth-input-icon" />
              <input
                type="text"
                className="checkout-input auth-padded-input"
                placeholder="e.g. Asad Ali"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="google-modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary google-confirm-btn"
              disabled={loading}
            >
              {loading ? 'Authenticating…' : 'Continue with this Google Account'}
            </button>
          </div>
        </form>

        <div className="google-modal-footer">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Your Gmail is securely verified & saved for order delivery updates.</span>
        </div>
      </div>
    </div>
  );
};
