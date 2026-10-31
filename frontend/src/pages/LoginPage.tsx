import type React from 'react';
import { useState } from 'react';
import { Leaf, AlertCircle, ArrowRight, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { GenuineGoogleButton } from '../components/GenuineGoogleButton';

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setGoogleNotice(null);

    const submitEmail = email.trim();
    const submitPass = password;

    if (!submitEmail || !submitPass) {
      setError('Please provide both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: submitEmail, password: submitPass }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid email or password.');
        return;
      }

      setUser(data.user);
      onSuccess();
    } catch (err) {
      setError('Connection failed. Please check your network and try again.');
    } finally {
      setLoading(false);
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

          {/* Genuine Google Identity Services Button */}
          <GenuineGoogleButton
            onSuccess={onSuccess}
            onError={(errMsg) => setError(errMsg)}
          />

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
