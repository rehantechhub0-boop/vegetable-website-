import type React from 'react';
import { useState } from 'react';
import { Leaf, AlertCircle, ArrowLeft, Lock, Mail, User, Phone } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { GoogleSignInModal } from '../components/GoogleSignInModal';
import { GenuineGoogleButton } from '../components/GenuineGoogleButton';

interface RegisterPageProps {
  onNavigateHome: () => void;
  onNavigateLogin: () => void;
  onSuccess: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateHome,
  onNavigateLogin,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError('Please provide your full name (at least 2 letters).');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please recheck.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() ? phone.trim() : null,
          password,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed. Please check your details.');
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
      <GoogleSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={onSuccess}
      />
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
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join us for easy order tracking, saved addresses, and faster checkout.</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-danger" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Genuine Google Identity Services Button */}
          <GenuineGoogleButton
            onSuccess={onSuccess}
            onError={(errMsg) => setError(errMsg)}
            onOpenFallbackModal={() => setIsGoogleModalOpen(true)}
          />

          <div className="auth-divider">
            <span>or register with email</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="checkout-input-group">
              <label htmlFor="reg-name" className="checkout-label">
                Full Name <span className="checkout-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  id="reg-name"
                  className="checkout-input auth-padded-input"
                  placeholder="e.g. Asad Qureshi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="checkout-input-group">
              <label htmlFor="reg-email" className="checkout-label">
                Email Address <span className="checkout-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  id="reg-email"
                  className="checkout-input auth-padded-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="checkout-input-group">
              <label htmlFor="reg-phone" className="checkout-label">
                Phone Number <span className="checkout-optional">(optional)</span>
              </label>
              <div className="auth-input-wrapper">
                <Phone size={16} className="auth-input-icon" />
                <input
                  type="tel"
                  id="reg-phone"
                  className="checkout-input auth-padded-input"
                  placeholder="0300-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="checkout-input-group">
              <label htmlFor="reg-password" className="checkout-label">
                Password <span className="checkout-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  id="reg-password"
                  className="checkout-input auth-padded-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="checkout-input-group">
              <label htmlFor="reg-confirm-password" className="checkout-label">
                Confirm Password <span className="checkout-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  id="reg-confirm-password"
                  className="checkout-input auth-padded-input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer-links">
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={onNavigateLogin}
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
