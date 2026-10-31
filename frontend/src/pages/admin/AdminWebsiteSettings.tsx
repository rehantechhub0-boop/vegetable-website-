import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Save, RefreshCw } from 'lucide-react';

export const AdminWebsiteSettings: React.FC = () => {
  const [brandName, setBrandName] = useState('Fresh Vegetables Muzaffargarh');
  const [tagline, setTagline] = useState('Fresh, hand-picked vegetables delivered directly to your doorstep.');
  const [contactPhone, setContactPhone] = useState('0300-1234567');
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [minOrder, setMinOrder] = useState('300');
  const [defaultFee, setDefaultFee] = useState('100');

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

      const gen = data.data?.general || {};
      const del = data.data?.delivery || {};

      if (gen.brand_name?.value) setBrandName(gen.brand_name.value);
      if (gen.brand_tagline?.value) setTagline(gen.brand_tagline.value);
      if (gen.contact_phone?.value) setContactPhone(gen.contact_phone.value);
      if (gen.currency_symbol?.value) setCurrencySymbol(gen.currency_symbol.value);

      if (del.min_order_amount?.value) setMinOrder(del.min_order_amount.value);
      if (del.default_delivery_fee?.value) setDefaultFee(del.default_delivery_fee.value);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch website settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = [
        { key: 'brand_name', value: brandName.trim(), group: 'general', description: 'Store brand name' },
        { key: 'brand_tagline', value: tagline.trim(), group: 'general', description: 'Tagline' },
        { key: 'contact_phone', value: contactPhone.trim(), group: 'general', description: 'Store customer support phone' },
        { key: 'currency_symbol', value: currencySymbol.trim(), group: 'general', description: 'Currency symbol' },
        { key: 'min_order_amount', value: minOrder.trim(), group: 'delivery', description: 'Global minimum order amount in Rs.' },
        { key: 'default_delivery_fee', value: defaultFee.trim(), group: 'delivery', description: 'Standard delivery fee in Rs.' },
      ];

      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setNotification('Store settings saved successfully.');
      setTimeout(() => setNotification(null), 4000);
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
        <p>Loading website settings...</p>
      </div>
    );
  }

  return (
    <div className="admin-website-settings">
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">General Website Settings</h1>
          <p className="admin-page-subtitle">
            Configure business identity, customer support hotlines, and platform delivery rules
          </p>
        </div>
      </div>

      <div className="admin-panel-card" style={{ maxWidth: 740 }}>
        <form onSubmit={handleSave} className="admin-settings-form">
          {error && (
            <div className="admin-form-alert alert--danger">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="admin-label">Business Display Name</label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="form-group">
            <label className="admin-label">Brand Tagline</label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="admin-label">Customer Support Phone</label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="admin-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Currency Symbol</label>
              <input
                type="text"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="admin-input font-mono"
              />
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="admin-label">Minimum Order Amount (PKR)</label>
              <div className="input-with-affix">
                <span className="input-prefix">Rs.</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="admin-input with-prefix"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="admin-label">Standard Default Delivery Fee (PKR)</label>
              <div className="input-with-affix">
                <span className="input-prefix">Rs.</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={defaultFee}
                  onChange={(e) => setDefaultFee(e.target.value)}
                  className="admin-input with-prefix"
                />
              </div>
            </div>
          </div>

          <div className="form-actions-right mt-4">
            <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
              <Save size={15} />
              {saving ? 'Saving...' : 'Save Website Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
