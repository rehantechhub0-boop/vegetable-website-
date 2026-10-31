import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Save, RefreshCw, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

export const AdminWebsiteSettings: React.FC = () => {
  const [brandName, setBrandName] = useState('Veggie House');
  const [tagline, setTagline] = useState('Fresh, hand-picked vegetables delivered directly to your doorstep.');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactPhone, setContactPhone] = useState('0342-7883728');
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [minOrder, setMinOrder] = useState('300');
  const [defaultFee, setDefaultFee] = useState('100');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
      if (gen.logo_url?.value) setLogoUrl(gen.logo_url.value);
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/v1/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.relativeUrl) {
        setLogoUrl(data.relativeUrl);
        setNotification('Logo uploaded! Click "Save Store Settings" to apply.');
        setTimeout(() => setNotification(null), 3000);
      } else {
        setError(data.error || 'Failed to upload logo.');
      }
    } catch (err: any) {
      setError(err.message || 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = [
        { key: 'brand_name', value: brandName.trim() || 'Veggie House', group: 'general', description: 'Store brand name' },
        { key: 'logo_url', value: logoUrl.trim(), group: 'general', description: 'Website Logo Image URL' },
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

      setNotification('Store settings & logo saved successfully!');
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
          <h1 className="admin-page-title">General Website & Logo Settings</h1>
          <p className="admin-page-subtitle">
            Configure brand name (Veggie House), upload custom store logo, customer support hotlines, and delivery rules
          </p>
        </div>
      </div>

      <div className="admin-panel-card" style={{ maxWidth: 780 }}>
        <form onSubmit={handleSave} className="admin-settings-form">
          {error && (
            <div className="admin-form-alert alert--danger">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* ── 1. WEBSITE LOGO SECTION ── */}
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            marginBottom: '1.75rem',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={18} color="#059669" />
              <span>Website Logo (Aapka Store Logo)</span>
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
              Apni website ke liye custom logo upload karein. Yeh logo header aur footer mein show hoga.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Logo Preview */}
              <div style={{
                width: '120px',
                height: '70px',
                borderRadius: '12px',
                border: '2px dashed #cbd5e1',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
                  />
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>No Logo</span>
                )}
              </div>

              {/* Upload Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label
                    className="btn btn-outline"
                    style={{
                      cursor: uploadingLogo ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      padding: '8px 16px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <Upload size={16} />
                    <span>{uploadingLogo ? 'Uploading Logo...' : 'Upload Logo File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        color: '#ef4444',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        padding: '8px 14px',
                        borderRadius: '8px',
                      }}
                    >
                      <Trash2 size={15} />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Or Image URL:</span>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. GENERAL BUSINESS DETAILS ── */}
          <div className="form-group">
            <label className="admin-label">Business Display Name</label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="admin-input"
              placeholder="e.g. Veggie House"
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
              placeholder="e.g. Farm-fresh vegetables delivered directly to your doorstep."
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
                className="admin-input"
                placeholder="0342-7883728"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Currency Symbol</label>
              <input
                type="text"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="admin-input"
              />
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="admin-label">Minimum Order Amount (PKR)</label>
              <input
                type="number"
                min="0"
                required
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Default Delivery Fee (PKR)</label>
              <input
                type="number"
                min="0"
                required
                value={defaultFee}
                onChange={(e) => setDefaultFee(e.target.value)}
                className="admin-input"
              />
            </div>
          </div>

          <div className="admin-form-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                fontWeight: 700,
                borderRadius: '10px',
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Store Settings & Logo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
