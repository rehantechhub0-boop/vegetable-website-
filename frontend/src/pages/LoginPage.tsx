import type React from 'react';
import { useState } from 'react';
import { Leaf, AlertCircle, ArrowRight, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface LoginPageProps {
  onNavigateHome: () => void;
  onNavigateRegister: () => void;
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateHome,
  onNavigateRegister,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGoogleNotice(null);

    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid email or password.');
        return;
      }

      setUser(data.user, data.token);
      onSuccess();
    } catch (err) {
      setError('Connection failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    setGoogleNotice(null);
    try {
      const res = await fetch('/api/v1/auth/google');
      const data = await res.json();
      if (res.ok && data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setGoogleNotice(
          data.error ||
          'Google Sign-In is not configured yet on this server. Please use Email login or continue as guest.'
        );
      }
    } catch {
      setGoogleNotice(
        'Unable to connect to Google authentication service. Please login with Email or continue as guest.'
      );
    }
  };

  return (
    <main className="auth-page-wrapper">
      <div className="container auth-container">
        <div className="auth-card">
          <button
            type="button"
            className="cart-breadcrumb-btn auth-back-btn"
            onClick={onNavigateHome}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>

          <div className="auth-header">
            <div className="auth-brand-icon">
              <Leaf size={28} />
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your account to review orders and manage delivery details.</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-danger" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {googleNotice && (
            <div className="auth-alert auth-alert-info" role="alert">
              <AlertCircle size={18} />
              <span>{googleNotice}</span>
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            className="btn btn-outline auth-google-btn"
            onClick={handleGoogleClick}
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
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or sign in with email</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="checkout-input-group">
              <label htmlFor="login-email" className="checkout-label">
                Email Address
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  id="login-email"
                  className="checkout-input auth-padded-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="checkout-input-group">
              <label htmlFor="login-password" className="checkout-label">
                Password
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  id="login-password"
                  className="checkout-input auth-padded-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer-links">
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={onNavigateRegister}
              >
                Register now
              </button>
            </p>

            <div className="auth-guest-option">
              <button
                type="button"
                className="btn btn-outline auth-guest-btn"
                onClick={onNavigateHome}
              >
                Continue as Guest
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
