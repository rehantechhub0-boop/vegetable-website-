import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, Trash2, CheckCircle, AlertCircle, X,
  Percent, RefreshCw
} from 'lucide-react';

interface VegetableOffer {
  id: string;
  name: string;
  slug: string;
  pricePerKg: number;
  offerPrice: number;
  discountAmount: number;
  discountPercent: number;
  isAvailable: boolean;
  image: string | null;
  updatedAt: string;
}

interface VegetableOption {
  id: string;
  name: string;
  pricePerKg: number;
  isOffer: boolean;
  offerPrice: number | null;
}

export const AdminOffers: React.FC = () => {
  const [offers, setOffers] = useState<VegetableOffer[]>([]);
  const [vegetables, setVegetables] = useState<VegetableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVegId, setSelectedVegId] = useState('');
  const [offerPriceInput, setOfferPriceInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchOffersAndVegetables = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resOffers, resVegs] = await Promise.all([
        fetch('/api/v1/admin/offers', { credentials: 'include' }),
        fetch('/api/v1/admin/vegetables?limit=100', { credentials: 'include' }),
      ]);

      const dataOffers = await resOffers.json();
      const dataVegs = await resVegs.json();

      if (!resOffers.ok || !dataOffers.success) throw new Error(dataOffers.error || 'Failed to fetch offers.');
      if (!resVegs.ok || !dataVegs.success) throw new Error(dataVegs.error || 'Failed to fetch vegetables.');

      setOffers(dataOffers.data || []);
      setVegetables(dataVegs.vegetables || dataVegs.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading offers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffersAndVegetables();
  }, []);

  const openAddOfferModal = () => {
    const candidate = vegetables.find((v) => !v.isOffer);
    setSelectedVegId(candidate ? candidate.id : vegetables[0]?.id || '');
    setOfferPriceInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const veg = vegetables.find((v) => v.id === selectedVegId);
    if (!veg) {
      setFormError('Please select a valid vegetable.');
      return;
    }

    const price = parseFloat(offerPriceInput);
    if (isNaN(price) || price <= 0) {
      setFormError('Offer price must be greater than 0.');
      return;
    }

    if (price >= veg.pricePerKg) {
      setFormError(`Offer price (Rs. ${price}) must be strictly lower than regular price (Rs. ${veg.pricePerKg}).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vegetableId: selectedVegId,
          offerPrice: price,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      setNotification(`Promotional discount applied to ${veg.name}.`);
      setTimeout(() => setNotification(null), 4000);
      setIsModalOpen(false);
      fetchOffersAndVegetables();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveOffer = async (vegetableId: string, name: string) => {
    if (!window.confirm(`Remove discount from "${name}" and restore regular price?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/offers/${vegetableId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      setNotification(`Offer removed from ${name}.`);
      setTimeout(() => setNotification(null), 4000);
      fetchOffersAndVegetables();
    } catch (err: any) {
      alert(`Remove offer failed: ${err.message}`);
    }
  };

  const selectedVeg = vegetables.find((v) => v.id === selectedVegId);
  const previewDiscount = selectedVeg && offerPriceInput
    ? selectedVeg.pricePerKg - parseFloat(offerPriceInput)
    : 0;
  const previewPercent = selectedVeg && previewDiscount > 0
    ? Math.round((previewDiscount / selectedVeg.pricePerKg) * 100)
    : 0;

  return (
    <div className="admin-offers-page">
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Vegetable Offers & Discounts</h1>
          <p className="admin-page-subtitle">
            Configure promotional pricing on fresh produce — automatic weight recalculations and badge highlights
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            onClick={openAddOfferModal}
            className="admin-btn admin-btn--primary"
          >
            <Plus size={16} /> Create New Offer
          </button>
        </div>
      </div>

      {/* Offers Table */}
      {loading ? (
        <div className="admin-loading-state">
          <RefreshCw size={26} className="spin-icon" color="var(--primary-600)" />
          <p>Loading promotional offers...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <AlertCircle size={22} color="var(--status-danger)" />
          <div>
            <h4>Failed to load offers</h4>
            <p>{error}</p>
          </div>
          <button type="button" onClick={fetchOffersAndVegetables} className="admin-btn admin-btn--secondary">
            Retry
          </button>
        </div>
      ) : offers.length === 0 ? (
        <div className="admin-empty-table">
          <Tag size={40} color="var(--text-light)" />
          <h3>No active offers running</h3>
          <p>Create a special price discount on any vegetable to feature it on the storefront.</p>
          <button type="button" onClick={openAddOfferModal} className="admin-btn admin-btn--primary">
            <Plus size={15} /> Create New Offer
          </button>
        </div>
      ) : (
        <div className="admin-panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Vegetable</th>
                  <th>Regular Rate</th>
                  <th>Promotional Offer</th>
                  <th>Customer Savings</th>
                  <th>Discount %</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((off) => (
                  <tr key={off.id}>
                    <td>
                      <div className="veg-title-col">
                        <span className="font-semibold text-headline">{off.name}</span>
                        <span className="text-muted text-xs font-mono">/{off.slug}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-muted line-through font-semibold">
                        Rs. {off.pricePerKg} / kg
                      </span>
                    </td>
                    <td>
                      <div className="price-col">
                        <span className="font-bold text-accent text-lg">
                          Rs. {off.offerPrice}
                        </span>
                        <span className="text-xs text-muted">/ kg</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-success font-semibold">
                        Save Rs. {off.discountAmount} / kg
                      </span>
                    </td>
                    <td>
                      <span className="discount-pill">
                        <Percent size={11} /> {off.discountPercent}% OFF
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveOffer(off.id, off.name)}
                        className="admin-icon-btn admin-icon-btn--danger"
                        title="Remove offer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Offer */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="admin-modal-header">
              <div className="modal-header-info">
                <Tag size={20} color="var(--accent-600)" />
                <h3 className="modal-title">Create Vegetable Offer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="admin-modal-form">
              {formError && (
                <div className="admin-form-alert alert--danger">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="admin-label">
                  Select Vegetable <span className="req-star">*</span>
                </label>
                <select
                  value={selectedVegId}
                  onChange={(e) => setSelectedVegId(e.target.value)}
                  className="admin-select"
                >
                  {vegetables.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Regular: Rs. {v.pricePerKg}/kg)
                    </option>
                  ))}
                </select>
              </div>

              {selectedVeg && (
                <div className="info-box-regular-rate mb-3 text-sm">
                  <span>Regular Base Price: </span>
                  <strong className="text-headline">Rs. {selectedVeg.pricePerKg} / kg</strong>
                </div>
              )}

              <div className="form-group">
                <label className="admin-label">
                  Discounted Offer Price / Kg (PKR) <span className="req-star">*</span>
                </label>
                <div className="input-with-affix">
                  <span className="input-prefix">Rs.</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="Must be lower than regular price"
                    value={offerPriceInput}
                    onChange={(e) => setOfferPriceInput(e.target.value)}
                    className="admin-input with-prefix"
                  />
                </div>
              </div>

              {/* Live Preview */}
              {previewPercent > 0 && (
                <div className="admin-formula-preview mt-2">
                  <div className="flex-between">
                    <span className="text-xs font-semibold text-brand">Customer Discount:</span>
                    <span className="discount-pill">
                      <Percent size={11} /> {previewPercent}% OFF
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Customer saves <strong>Rs. {previewDiscount}</strong> on every kilogram.
                  </div>
                </div>
              )}

              <div className="modal-actions-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="admin-btn admin-btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="admin-btn admin-btn--primary"
                >
                  {submitting ? 'Applying...' : 'Apply Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
