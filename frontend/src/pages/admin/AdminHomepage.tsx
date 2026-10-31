import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Save, RefreshCw } from 'lucide-react';

export const AdminHomepage: React.FC = () => {
  const [heroHeading, setHeroHeading] = useState('Fresh Vegetables, Delivered to Your Doorstep');
  const [heroSubtext, setHeroSubtext] = useState('Choose any vegetable by weight — 250g up to bulk quantities. Place your order and we deliver fresh to your home in Muzaffargarh.');
  const [ctaText, setCtaText] = useState('Shop Vegetables');
  const [announcement, setAnnouncement] = useState('Taaza Subziyaan Seedha Aapkay Ghar Tak — Daily Morning & Evening Delivery in Muzaffargarh');
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [deliveryInfoNote, setDeliveryInfoNote] = useState('Local doorstep delivery across Muzaffargarh with Cash on Delivery.');

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

      const hp = data.data?.homepage || {};
      if (hp.homepage_hero_title?.value) setHeroHeading(hp.homepage_hero_title.value);
      if (hp.homepage_hero_subtitle?.value) setHeroSubtext(hp.homepage_hero_subtitle.value);
      if (hp.homepage_cta_text?.value) setCtaText(hp.homepage_cta_text.value);
      if (hp.homepage_announcement?.value) setAnnouncement(hp.homepage_announcement.value);
      if (hp.homepage_announcement_enabled?.value !== undefined) {
        setAnnouncementEnabled(hp.homepage_announcement_enabled.value === 'true');
      }
      if (hp.homepage_delivery_note?.value) setDeliveryInfoNote(hp.homepage_delivery_note.value);
    } catch (err: any) {
      setError(err.message || 'Failed to load homepage settings.');
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
        { key: 'homepage_hero_title', value: heroHeading, group: 'homepage', description: 'Hero section main headline' },
        { key: 'homepage_hero_subtitle', value: heroSubtext, group: 'homepage', description: 'Hero section subtext' },
        { key: 'homepage_cta_text', value: ctaText, group: 'homepage', description: 'Hero main button CTA text' },
        { key: 'homepage_announcement', value: announcement, group: 'homepage', description: 'Header announcement bar text' },
        { key: 'homepage_announcement_enabled', value: String(announcementEnabled), group: 'homepage', description: 'Toggle announcement bar' },
        { key: 'homepage_delivery_note', value: deliveryInfoNote, group: 'homepage', description: 'Delivery trust badge note' },
      ];

      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setNotification('Homepage content updated successfully.');
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
        <p>Loading homepage settings...</p>
      </div>
    );
  }

  return (
    <div className="admin-homepage-settings">
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Homepage Content Management</h1>
          <p className="admin-page-subtitle">
            Customize hero headlines, promotional announcements, and Muzaffargarh delivery messaging
          </p>
        </div>
      </div>

      <div className="admin-panel-card" style={{ maxWidth: 760 }}>
        <form onSubmit={handleSave} className="admin-settings-form">
          {error && (
            <div className="admin-form-alert alert--danger">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <h3 className="section-divider-title">Top Announcement Bar</h3>

          <div className="form-group">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={announcementEnabled}
                onChange={(e) => setAnnouncementEnabled(e.target.checked)}
              />
              <span>Display announcement banner across website</span>
            </label>
          </div>

          <div className="form-group">
            <label className="admin-label">Announcement Message</label>
            <input
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="admin-input"
            />
          </div>

          <h3 className="section-divider-title mt-4">Hero Section Content</h3>

          <div className="form-group">
            <label className="admin-label">Hero Headline</label>
            <input
              type="text"
              required
              value={heroHeading}
              onChange={(e) => setHeroHeading(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="form-group">
            <label className="admin-label">Hero Supporting Subtext</label>
            <textarea
              rows={3}
              required
              value={heroSubtext}
              onChange={(e) => setHeroSubtext(e.target.value)}
              className="admin-textarea"
            />
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="admin-label">Primary CTA Button Text</label>
              <input
                type="text"
                required
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Delivery Note</label>
              <input
                type="text"
                value={deliveryInfoNote}
                onChange={(e) => setDeliveryInfoNote(e.target.value)}
                className="admin-input"
              />
            </div>
          </div>

          <div className="form-actions-right mt-4">
            <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
              <Save size={15} />
              {saving ? 'Saving Changes...' : 'Save Homepage Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
