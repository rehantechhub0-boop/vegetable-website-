import React, { useState, useEffect } from 'react';
import {
  MapPin, Plus, Edit2, Trash2, CheckCircle, AlertCircle,
  X, Eye, EyeOff, RefreshCw
} from 'lucide-react';

interface DeliveryZone {
  id: string;
  areaName: string;
  deliveryFee: number;
  isActive: boolean;
  ordersCount: number;
  createdAt: string;
}

export const AdminDeliverySettings: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  // Form State
  const [formAreaName, setFormAreaName] = useState('');
  const [formDeliveryFee, setFormDeliveryFee] = useState<string>('50');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/delivery-zones', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch delivery zones.');
      }
      setZones(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading zones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingZone(null);
    setFormAreaName('');
    setFormDeliveryFee('50');
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (zone: DeliveryZone) => {
    setModalMode('edit');
    setEditingZone(zone);
    setFormAreaName(zone.areaName);
    setFormDeliveryFee(String(zone.deliveryFee));
    setFormIsActive(zone.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const feeNum = parseFloat(formDeliveryFee);
    if (isNaN(feeNum) || feeNum < 0) {
      setFormError('Delivery fee must be 0 or a positive number.');
      return;
    }

    if (!formAreaName.trim()) {
      setFormError('Area name is required.');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/v1/admin/delivery-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            areaName: formAreaName.trim(),
            deliveryFee: feeNum,
            isActive: formIsActive,
          }),
        });
      } else {
        res = await fetch(`/api/v1/admin/delivery-zones/${editingZone!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            areaName: formAreaName.trim(),
            deliveryFee: feeNum,
            isActive: formIsActive,
          }),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      setNotification(`Delivery zone "${formAreaName}" saved.`);
      setTimeout(() => setNotification(null), 4000);
      setIsModalOpen(false);
      fetchZones();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleZoneActive = async (zone: DeliveryZone) => {
    try {
      const res = await fetch(`/api/v1/admin/delivery-zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setZones((prev) =>
        prev.map((z) => (z.id === zone.id ? { ...z, isActive: !z.isActive } : z))
      );
    } catch (err: any) {
      alert(`Could not toggle zone: ${err.message}`);
    }
  };

  const handleDeleteZone = async (zone: DeliveryZone) => {
    const confirmMsg = zone.ordersCount > 0
      ? `Zone "${zone.areaName}" is linked to ${zone.ordersCount} past order(s). Deleting will deactivate it to protect order delivery records. Continue?`
      : `Permanently delete delivery zone "${zone.areaName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/v1/admin/delivery-zones/${zone.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      setNotification(json.message || 'Delivery zone removed.');
      setTimeout(() => setNotification(null), 4000);
      fetchZones();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="admin-delivery-settings-page">
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Muzaffargarh Delivery Zones</h1>
          <p className="admin-page-subtitle">
            Configure coverage areas, localized delivery tariffs, and active routing zones
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            onClick={openCreateModal}
            className="admin-btn admin-btn--primary"
          >
            <Plus size={16} /> Add Delivery Area
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading-state">
          <RefreshCw size={26} className="spin-icon" color="var(--primary-600)" />
          <p>Loading delivery zones...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <AlertCircle size={22} color="var(--status-danger)" />
          <div>
            <h4>Failed to load delivery zones</h4>
            <p>{error}</p>
          </div>
          <button type="button" onClick={fetchZones} className="admin-btn admin-btn--secondary">
            Retry
          </button>
        </div>
      ) : zones.length === 0 ? (
        <div className="admin-empty-table">
          <MapPin size={40} color="var(--text-light)" />
          <h3>No delivery zones created</h3>
          <p>Add the first delivery area in Muzaffargarh to enable customer checkout.</p>
          <button type="button" onClick={openCreateModal} className="admin-btn admin-btn--primary">
            <Plus size={15} /> Add Delivery Area
          </button>
        </div>
      ) : (
        <div className="admin-panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Area / Zone Name</th>
                  <th>Delivery Fee (PKR)</th>
                  <th>Status</th>
                  <th>Associated Orders</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td>
                      <div className="zone-name-cell">
                        <MapPin size={15} color="var(--primary-600)" />
                        <span className="font-semibold text-headline">{zone.areaName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-bold text-headline">Rs. {zone.deliveryFee}</span>
                      {zone.deliveryFee === 0 && (
                        <span className="badge-primary-img ml-2">Free Delivery</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleZoneActive(zone)}
                        className={`status-toggle-btn ${zone.isActive ? 'toggle-active' : 'toggle-inactive'}`}
                      >
                        {zone.isActive ? (
                          <>
                            <Eye size={12} /> Active in Checkout
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <span className="text-sm font-mono text-muted">
                        {zone.ordersCount} order{zone.ordersCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-group">
                        <button
                          type="button"
                          onClick={() => openEditModal(zone)}
                          className="admin-icon-btn"
                          title="Edit area"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteZone(zone)}
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="Delete or deactivate"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Zone */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="admin-modal-header">
              <div className="modal-header-info">
                <MapPin size={20} color="var(--primary-600)" />
                <h3 className="modal-title">
                  {modalMode === 'create' ? 'Add Delivery Area' : `Edit: ${editingZone?.areaName}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="admin-modal-form">
              {formError && (
                <div className="admin-form-alert alert--danger">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="admin-label">
                  Muzaffargarh Area Name <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Raziq Garden, City Center, Railway Road"
                  value={formAreaName}
                  onChange={(e) => setFormAreaName(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="form-group">
                <label className="admin-label">
                  Delivery Fee (PKR) <span className="req-star">*</span>
                </label>
                <div className="input-with-affix">
                  <span className="input-prefix">Rs.</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="e.g. 50"
                    value={formDeliveryFee}
                    onChange={(e) => setFormDeliveryFee(e.target.value)}
                    className="admin-input with-prefix"
                  />
                </div>
                <span className="text-xs text-muted mt-1 block">
                  Set 0 for free doorstep delivery in this area.
                </span>
              </div>

              <div className="form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span>Active for customer selection in checkout</span>
                </label>
              </div>

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
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Area' : 'Update Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
