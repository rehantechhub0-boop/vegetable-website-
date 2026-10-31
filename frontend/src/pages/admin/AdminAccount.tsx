import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, Save, RefreshCw } from 'lucide-react';

export const AdminAccount: React.FC = () => {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/me', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setAdminUser(data.user);
      setName(data.user.name || '');
      setPhone(data.user.phone || '');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/v1/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setNotification('Profile details updated.');
      setTimeout(() => setNotification(null), 4000);
      setAdminUser(data.user);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassSaving(true);
    try {
      const res = await fetch('/api/v1/admin/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setNotification('Password changed successfully. Older sessions revoked.');
      setTimeout(() => setNotification(null), 4000);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setPassSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-state">
        <RefreshCw size={26} className="spin-icon" color="var(--primary-600)" />
        <p>Loading administrator profile...</p>
      </div>
    );
  }

  return (
    <div className="admin-account-settings">
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Administrator Account</h1>
          <p className="admin-page-subtitle">
            Manage your personal administrative credentials and secure authentication tokens
          </p>
        </div>
      </div>

      <div className="admin-two-col-grid" style={{ maxWidth: 960 }}>
        {/* Profile Card */}
        <div className="admin-panel-card">
          <div className="admin-panel-card__header">
            <div>
              <h3 className="panel-title">Personal Information</h3>
              <p className="panel-subtitle">Display name and phone number</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="admin-settings-form mt-2">
            {profileError && (
              <div className="admin-form-alert alert--danger">
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="admin-label">Admin Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Account Email (Immutable)</label>
              <input
                type="text"
                disabled
                value={adminUser?.email || ''}
                className="admin-input font-mono opacity-70"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="admin-input font-mono"
              />
            </div>

            <div className="form-actions-right mt-3">
              <button type="submit" disabled={profileSaving} className="admin-btn admin-btn--primary">
                <Save size={14} />
                {profileSaving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="admin-panel-card">
          <div className="admin-panel-card__header">
            <div>
              <h3 className="panel-title">Security & Password</h3>
              <p className="panel-subtitle">Update your master admin password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="admin-settings-form mt-2">
            {passError && (
              <div className="admin-form-alert alert--danger">
                <AlertCircle size={16} />
                <span>{passError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="admin-label">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">New Password (Min 6 Characters)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="form-actions-right mt-3">
              <button type="submit" disabled={passSaving} className="admin-btn admin-btn--primary">
                <Lock size={14} />
                {passSaving ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
