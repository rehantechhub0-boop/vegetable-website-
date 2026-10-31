import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Save, RefreshCw, Info } from 'lucide-react';

export const AdminWhatsApp: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [businessPhone, setBusinessPhone] = useState('923001234567');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isTokenConfigured, setIsTokenConfigured] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/settings', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      const wa = data.data?.whatsapp || {};
      if (wa.whatsapp_enabled?.value !== undefined) {
        setEnabled(wa.whatsapp_enabled.value === 'true');
      }
      if (wa.whatsapp_number?.value) setBusinessPhone(wa.whatsapp_number.value);
      if (wa.whatsapp_phone_number_id?.value) setPhoneNumberId(wa.whatsapp_phone_number_id.value);
      if (wa.whatsapp_business_account_id?.value) setBusinessAccountId(wa.whatsapp_business_account_id.value);

      if (wa.whatsapp_api_token?.isConfigured) {
        setIsTokenConfigured(true);
        setApiToken('••••••••••••••••');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch WhatsApp configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any[] = [
        { key: 'whatsapp_enabled', value: String(enabled), group: 'whatsapp', description: 'Enable WhatsApp customer order alerts' },
        { key: 'whatsapp_number', value: businessPhone.trim(), group: 'whatsapp', description: 'Business WhatsApp phone number' },
        { key: 'whatsapp_phone_number_id', value: phoneNumberId.trim(), group: 'whatsapp', description: 'Meta Cloud API Phone Number ID' },
        { key: 'whatsapp_business_account_id', value: businessAccountId.trim(), group: 'whatsapp', description: 'Meta WABA ID' },
      ];

      // Only send token if user modified it away from the masked placeholder
      if (apiToken && apiToken !== '••••••••••••••••') {
        payload.push({
          key: 'whatsapp_api_token',
          value: apiToken.trim(),
          group: 'whatsapp',
          description: 'Meta WhatsApp Business System User Access Token',
        });
      }

      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setNotification('WhatsApp settings updated securely.');
      setTimeout(() => setNotification(null), 4000);
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-state">
        <RefreshCw size={26} className="spin-icon" color="var(--primary-600)" />
        <p>Loading WhatsApp configuration...</p>
      </div>
    );
  }

  const isConfigured = isTokenConfigured && phoneNumberId && businessAccountId;

  return (
    <div className="admin-whatsapp-settings">
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Official WhatsApp Business Cloud API</h1>
          <p className="admin-page-subtitle">
            Configure automated customer order receipts & delivery updates via official Meta WhatsApp Business Cloud API
          </p>
        </div>
        <div>
          <span className={`status-pill ${isConfigured ? 'status-pill--success' : 'status-pill--warning'}`}>
            {isConfigured ? 'Official API Configured' : 'Credentials Not Configured'}
          </span>
        </div>
      </div>

      <div className="admin-panel-card" style={{ maxWidth: 740 }}>
        {/* Compliance Note */}
        <div className="admin-info-banner">
          <Info size={18} color="var(--primary-700)" />
          <div>
            <h4 className="font-semibold text-headline text-sm">Security & Anti-Spam Compliance</h4>
            <p className="text-xs text-body leading-relaxed mt-0.5">
              This system strictly interfaces with the official <strong>Meta WhatsApp Business Cloud API</strong>.
              Tokens are encrypted and never exposed to browser clients.
              If credentials are not yet configured, customer alerts are queued safely without mock delivery.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="admin-settings-form mt-4">
          {error && (
            <div className="admin-form-alert alert--danger">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="font-semibold">Enable Automated WhatsApp Notifications</span>
            </label>
          </div>

          <div className="form-group">
            <label className="admin-label">
              Customer Support WhatsApp Number (with Country Code)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 923001234567"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              className="admin-input font-mono"
            />
            <span className="text-xs text-muted mt-1 block">
              Public contact number displayed on the website footer and order receipts.
            </span>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="admin-label">
                Meta Phone Number ID
              </label>
              <input
                type="text"
                placeholder="e.g. 104829104820194"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="admin-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">
                WhatsApp Business Account ID (WABA)
              </label>
              <input
                type="text"
                placeholder="e.g. 192837465019283"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                className="admin-input font-mono"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="admin-label">
              System User Access Token
            </label>
            <div className="input-with-affix">
              <input
                type="password"
                placeholder={isTokenConfigured ? '••••••••••••••••' : 'Enter Meta permanent access token'}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="admin-input font-mono"
              />
            </div>
            <span className="text-xs text-muted mt-1 block">
              {isTokenConfigured
                ? 'Token is configured and secured. Leave as placeholder unless updating.'
                : 'Permanent token generated in Meta Business Suite > System Users.'}
            </span>
          </div>

          <div className="form-actions-right mt-4">
            <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
              <Save size={15} />
              {saving ? 'Encrypting & Saving...' : 'Save WhatsApp Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
