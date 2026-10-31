import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Save, ShieldCheck, RefreshCw } from 'lucide-react';

export const AdminPayment: React.FC = () => {
  const [codEnabled, setCodEnabled] = useState(true);
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [gatewayMode, setGatewayMode] = useState('sandbox');
  const [gatewayProvider, setGatewayProvider] = useState('generic_pk');
  const [merchantId, setMerchantId] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

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

      const pay = data.data?.payment || {};
      if (pay.payment_cod_enabled?.value !== undefined) {
        setCodEnabled(pay.payment_cod_enabled.value === 'true');
      }
      if (pay.payment_online_enabled?.value !== undefined) {
        setOnlineEnabled(pay.payment_online_enabled.value === 'true');
      }
      if (pay.payment_gateway_mode?.value) setGatewayMode(pay.payment_gateway_mode.value);
      if (pay.payment_provider?.value) setGatewayProvider(pay.payment_provider.value);
      if (pay.payment_merchant_id?.value) setMerchantId(pay.payment_merchant_id.value);

      if (pay.payment_secret_key?.isConfigured) {
        setApiKeyMasked(true);
        setApiKeyInput('••••••••••••••••');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment configuration.');
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
        { key: 'payment_cod_enabled', value: String(codEnabled), group: 'payment', description: 'Enable Cash on Delivery' },
        { key: 'payment_online_enabled', value: String(onlineEnabled), group: 'payment', description: 'Enable Online Card / Advance Payments' },
        { key: 'payment_gateway_mode', value: gatewayMode, group: 'payment', description: 'Gateway operating mode (sandbox or production)' },
        { key: 'payment_provider', value: gatewayProvider, group: 'payment', description: 'Payment gateway adapter provider' },
        { key: 'payment_merchant_id', value: merchantId.trim(), group: 'payment', description: 'Payment Merchant Identifier' },
      ];

      if (apiKeyInput && apiKeyInput !== '••••••••••••••••') {
        payload.push({
          key: 'payment_secret_key',
          value: apiKeyInput.trim(),
          group: 'payment',
          description: 'Payment API Secret Key',
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

      setNotification('Payment settings updated.');
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
        <p>Loading payment settings...</p>
      </div>
    );
  }

  const isOnlineConfigured = apiKeyMasked && merchantId;

  return (
    <div className="admin-payment-settings">
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Payment Gateways & Methods</h1>
          <p className="admin-page-subtitle">
            Configure Cash on Delivery and online debit/credit card gateway integration for Muzaffargarh orders
          </p>
        </div>
        <div>
          <span className={`status-pill ${isOnlineConfigured ? 'status-pill--success' : 'status-pill--warning'}`}>
            {isOnlineConfigured ? 'Online Gateway Configured' : 'Awaiting Merchant Credentials'}
          </span>
        </div>
      </div>

      <div className="admin-panel-card" style={{ maxWidth: 740 }}>
        {/* Security Rule Banner */}
        <div className="admin-info-banner">
          <ShieldCheck size={20} color="var(--primary-700)" />
          <div>
            <h4 className="font-semibold text-headline text-sm">Strict Payment Security Architecture</h4>
            <p className="text-xs text-body leading-relaxed mt-0.5">
              This system never stores card numbers, CVV, OTP, or PINs.
              Online checkout is safely gated until server-side gateway reconciliation is verified.
              Cash on Delivery (COD) remains the primary trusted method in Muzaffargarh.
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

          <h3 className="section-divider-title">1. Cash on Delivery (COD)</h3>
          <div className="form-group">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
              />
              <span className="font-semibold">Enable Cash on Delivery (Recommended for Muzaffargarh)</span>
            </label>
            <span className="text-xs text-muted mt-1 block">
              Customers pay physical cash upon arrival and inspection of their fresh vegetables.
            </span>
          </div>

          <h3 className="section-divider-title mt-4">2. Online / Advance Payment Gateway</h3>
          <div className="form-group">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={onlineEnabled}
                onChange={(e) => setOnlineEnabled(e.target.checked)}
              />
              <span className="font-semibold">Enable Online Card & Advance Payments in Checkout</span>
            </label>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="admin-label">Gateway Adapter</label>
              <select
                value={gatewayProvider}
                onChange={(e) => setGatewayProvider(e.target.value)}
                className="admin-select"
              >
                <option value="generic_pk">Pakistan Generic Payment Gateway Adapter</option>
                <option value="jazzcash">JazzCash Business API</option>
                <option value="easypaisa">Easypaisa IPG</option>
                <option value="hbl">HBL Pay Checkout</option>
                <option value="payfast">PayFast APPS</option>
              </select>
            </div>

            <div className="form-group">
              <label className="admin-label">Environment Mode</label>
              <select
                value={gatewayMode}
                onChange={(e) => setGatewayMode(e.target.value)}
                className="admin-select"
              >
                <option value="sandbox">Sandbox / Testing</option>
                <option value="production">Live Production</option>
              </select>
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="admin-label">Merchant ID / Store Code</label>
              <input
                type="text"
                placeholder="e.g. MC-981240"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className="admin-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Secret API Key / Hash Key</label>
              <input
                type="password"
                placeholder={apiKeyMasked ? '••••••••••••••••' : 'Enter API secret key'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="admin-input font-mono"
              />
            </div>
          </div>

          <div className="form-actions-right mt-4">
            <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
              <Save size={15} />
              {saving ? 'Updating Gateways...' : 'Save Payment Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
