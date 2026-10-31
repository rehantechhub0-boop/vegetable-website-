import React, { useState, useEffect } from 'react';
import {
  Leaf, Search, Plus, Edit2, Trash2, Eye, EyeOff,
  Image as ImageIcon, CheckCircle, AlertCircle, X, Upload,
  Star, RefreshCw, HelpCircle
} from 'lucide-react';

interface VegetableImage {
  id: string;
  url: string;
  isPrimary: boolean;
  orderIndex: number;
}

interface Vegetable {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricePerKg: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isOffer: boolean;
  offerPrice: number | null;
  ordersCount: number;
  images: VegetableImage[];
  createdAt: string;
  updatedAt: string;
}

export const AdminVegetables: React.FC = () => {
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal State: Create or Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingVeg, setEditingVeg] = useState<Vegetable | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Image Upload State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedVegIds, setSelectedVegIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelectVeg = (id: string) => {
    setSelectedVegIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVeg = () => {
    if (vegetables.length > 0 && selectedVegIds.length === vegetables.length) {
      setSelectedVegIds([]);
    } else {
      setSelectedVegIds(vegetables.map((v) => v.id));
    }
  };

  const handleBulkVegetableAction = async (action: 'set-availability' | 'delete', isAvailable?: boolean) => {
    if (selectedVegIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedVegIds.length} vegetables from catalog?`)) {
      return;
    }

    setBulkLoading(true);
    try {
      const res = await fetch('/api/v1/admin/vegetables/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          ids: selectedVegIds,
          isAvailable,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bulk vegetable operation failed.');
      }
      setNotification(data.message || 'Vegetables updated successfully!');
      setTimeout(() => setNotification(null), 4000);
      setSelectedVegIds([]);
      fetchVegetables();
    } catch (err: any) {
      alert(`Bulk action error: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchVegetables = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set('search', search.trim());
      q.set('page', String(page));
      q.set('limit', '25');

      const res = await fetch(`/api/v1/admin/vegetables?${q.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch vegetables.');
      }
      setVegetables(data.vegetables || data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error fetching vegetables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVegetables();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVegetables();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingVeg(null);
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormPrice('');
    setFormAvailable(true);
    setFormFeatured(false);
    setFormError(null);
    setImageError(null);
    setSelectedImageFile(null);
    setFormImageUrl('');
    setImagePreviewUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (veg: Vegetable) => {
    setModalMode('edit');
    setEditingVeg(veg);
    setFormName(veg.name);
    setFormSlug(veg.slug);
    setFormDesc(veg.description);
    setFormPrice(String(veg.pricePerKg));
    setFormAvailable(veg.isAvailable);
    setFormFeatured(veg.isFeatured);
    setFormError(null);
    setImageError(null);
    setSelectedImageFile(null);
    setFormImageUrl('');
    setImagePreviewUrl(null);
    setIsModalOpen(true);
  };

  const handleSaveVegetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Price per kg must be a positive number (greater than 0).');
      return;
    }

    if (!formName.trim()) {
      setFormError('Vegetable name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload: any = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        description: formDesc.trim(),
        pricePerKg: priceNum,
        isAvailable: formAvailable,
        isFeatured: formFeatured,
      };

      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/v1/admin/vegetables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/v1/admin/vegetables/${editingVeg!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Save failed.');
      }

      setNotification(`Vegetable "${formName}" saved successfully.`);
      setTimeout(() => setNotification(null), 4000);

      if (modalMode === 'create') {
        // If an image was selected or entered during creation, immediately upload it
        if (selectedImageFile) {
          const formData = new FormData();
          formData.append('image', selectedImageFile);
          formData.append('isPrimary', 'true');
          await fetch(`/api/v1/admin/vegetables/${json.vegetable.id}/images`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
        } else if (formImageUrl.trim()) {
          await fetch(`/api/v1/admin/vegetables/${json.vegetable.id}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ imageUrl: formImageUrl.trim(), isPrimary: true }),
          });
        }
        setIsModalOpen(false);
        fetchVegetables();
      } else {
        // Update local object
        setEditingVeg(json.vegetable);
        fetchVegetables();
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleAvailability = async (veg: Vegetable) => {
    try {
      const res = await fetch(`/api/v1/admin/vegetables/${veg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isAvailable: !veg.isAvailable }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setVegetables((prev) =>
        prev.map((v) => (v.id === veg.id ? { ...v, isAvailable: !v.isAvailable } : v))
      );
    } catch (err: any) {
      alert(`Failed to toggle availability: ${err.message}`);
    }
  };

  const handleDeleteVegetable = async (veg: Vegetable) => {
    const confirmMsg = veg.ordersCount > 0
      ? `"${veg.name}" is referenced by ${veg.ordersCount} historical order(s). Deleting will deactivate it to protect order receipts. Continue?`
      : `Are you sure you want to permanently delete "${veg.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/v1/admin/vegetables/${veg.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      setNotification(json.message || 'Vegetable removed.');
      setTimeout(() => setNotification(null), 4000);
      fetchVegetables();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Upload an image for the active vegetable
  const handleUploadImage = async () => {
    if (!selectedImageFile || !editingVeg) return;
    setUploadingImage(true);
    setImageError(null);

    const formData = new FormData();
    formData.append('image', selectedImageFile);
    formData.append('isPrimary', editingVeg.images.length === 0 ? 'true' : 'false');

    try {
      const res = await fetch(`/api/v1/admin/vegetables/${editingVeg.id}/images`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      // Refresh editing veg
      const updatedImages = [...editingVeg.images, json.image];
      setEditingVeg({ ...editingVeg, images: updatedImages });
      setSelectedImageFile(null);
      fetchVegetables();
    } catch (err: any) {
      setImageError(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!editingVeg) return;
    try {
      const res = await fetch(`/api/v1/admin/vegetables/${editingVeg.id}/images/${imageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      const filtered = editingVeg.images.filter((img) => img.id !== imageId);
      setEditingVeg({ ...editingVeg, images: filtered });
      fetchVegetables();
    } catch (err: any) {
      alert(`Failed to delete image: ${err.message}`);
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!editingVeg) return;
    try {
      const res = await fetch(`/api/v1/admin/vegetables/${editingVeg.id}/images/${imageId}/primary`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      const updated = editingVeg.images.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      }));
      setEditingVeg({ ...editingVeg, images: updated });
      fetchVegetables();
    } catch (err: any) {
      alert(`Failed to set primary image: ${err.message}`);
    }
  };

  // Helper calculation for fixed weights preview
  const previewPrice = (weightKg: number) => {
    const p = parseFloat(formPrice);
    if (isNaN(p) || p <= 0) return '—';
    return `Rs. ${(weightKg * p).toLocaleString()}`;
  };

  return (
    <div className="admin-vegetables-page">
      {/* Toast Notification */}
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Vegetable Inventory Management</h1>
          <p className="admin-page-subtitle">
            Catalog of fresh vegetables serving Muzaffargarh — pricing, availability, and weight formulas
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            onClick={openCreateModal}
            className="admin-btn admin-btn--primary"
          >
            <Plus size={16} /> Add New Vegetable
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} className="admin-search-form">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search vegetables by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); fetchVegetables(); }}
              className="clear-search-btn"
            >
              <X size={14} />
            </button>
          )}
        </form>
        <span className="results-count-text">
          Showing {vegetables.length} of {total} varieties
        </span>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="admin-loading-state">
          <RefreshCw size={26} className="spin-icon" color="var(--primary-600)" />
          <p>Loading vegetables catalog...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <AlertCircle size={22} color="var(--status-danger)" />
          <div>
            <h4>Failed to load catalog</h4>
            <p>{error}</p>
          </div>
          <button type="button" onClick={fetchVegetables} className="admin-btn admin-btn--secondary">
            Retry
          </button>
        </div>
      ) : vegetables.length === 0 ? (
        <div className="admin-empty-table">
          <Leaf size={40} color="var(--text-light)" />
          <h3>No vegetables found</h3>
          <p>Try modifying your search query or add a new vegetable.</p>
          <button type="button" onClick={openCreateModal} className="admin-btn admin-btn--primary">
            <Plus size={15} /> Add Vegetable
          </button>
        </div>
      ) : (
        <div className="admin-panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={vegetables.length > 0 && selectedVegIds.length === vegetables.length}
                      onChange={toggleSelectAllVeg}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                      title="Select all vegetables"
                    />
                  </th>
                  <th style={{ width: 60 }}>Image</th>
                  <th>Name & Slug</th>
                  <th>Price / Kg</th>
                  <th>Weight Scale Preview</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vegetables.map((veg) => {
                  const primaryImg = veg.images.find((i) => i.isPrimary) || veg.images[0];
                  const isChecked = selectedVegIds.includes(veg.id);
                  return (
                    <tr key={veg.id} style={{ backgroundColor: isChecked ? '#f0fdf4' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectVeg(veg.id)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td>
                        <div className="veg-thumbnail-box">
                          {primaryImg ? (
                            <img src={primaryImg.url} alt={veg.name} className="veg-thumb-img" />
                          ) : (
                            <Leaf size={20} color="var(--primary-400)" />
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="veg-title-col">
                          <span className="font-semibold text-headline">{veg.name}</span>
                          <span className="text-muted text-xs font-mono">/{veg.slug}</span>
                          {veg.isFeatured && (
                            <span className="badge-featured">Featured</span>
                          )}
                          {veg.isOffer && (
                            <span className="badge-offer">Offer: Rs. {veg.offerPrice}/kg</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="price-col">
                          <span className="font-bold text-headline">Rs. {veg.pricePerKg}</span>
                          <span className="text-muted text-xs">/ kg</span>
                        </div>
                      </td>
                      <td>
                        <div className="weight-preview-tooltip text-xs text-muted">
                          <span>250g: Rs. {Math.round(veg.pricePerKg * 0.25)}</span> ·{' '}
                          <span>1kg: Rs. {veg.pricePerKg}</span> ·{' '}
                          <span>5kg: Rs. {veg.pricePerKg * 5}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(veg)}
                          className={`status-toggle-btn ${veg.isAvailable ? 'toggle-active' : 'toggle-inactive'}`}
                          title={veg.isAvailable ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {veg.isAvailable ? (
                            <>
                              <Eye size={12} /> Available
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
                          {veg.ordersCount} orders
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions-group" style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(veg)}
                            className="admin-btn admin-btn--secondary btn--sm"
                            title="Edit vegetable details, price & photos"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.78rem' }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVegetable(veg)}
                            className="admin-icon-btn admin-icon-btn--danger"
                            title="Delete vegetable"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sticky Vegetable Bulk Action Bar */}
      {selectedVegIds.length > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: '1rem',
            zIndex: 100,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              🥬 {selectedVegIds.length} vegetables selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedVegIds([])}
              style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleBulkVegetableAction('set-availability', true)}
              disabled={bulkLoading}
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ✅ Mark In-Stock (Available)
            </button>
            <button
              type="button"
              onClick={() => handleBulkVegetableAction('set-availability', false)}
              disabled={bulkLoading}
              style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ⏸️ Mark Out-of-Stock (Inactive)
            </button>
            <button
              type="button"
              onClick={() => handleBulkVegetableAction('delete')}
              disabled={bulkLoading}
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ❌ Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Vegetable */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 650 }}
          >
            <div className="admin-modal-header">
              <div className="modal-header-info">
                <Leaf size={20} color="var(--primary-600)" />
                <h3 className="modal-title">
                  {modalMode === 'create' ? 'Add New Vegetable' : `Edit: ${editingVeg?.name}`}
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

            <form onSubmit={handleSaveVegetable} className="admin-modal-form">
              {formError && (
                <div className="admin-form-alert alert--danger">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-row-two">
                <div className="form-group">
                  <label className="admin-label">
                    Vegetable Name <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Desi Tomatoes (ٹماٹر)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label">
                    URL Slug <span className="text-muted text-xs">(Auto-generated if empty)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., desi-tomatoes"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="admin-label">Description</label>
                <textarea
                  rows={2}
                  placeholder="Fresh farm produce sourced daily from Muzaffargarh growers..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="admin-textarea"
                />
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label className="admin-label">
                    Price Per Kilogram (PKR) <span className="req-star">*</span>
                  </label>
                  <div className="input-with-affix">
                    <span className="input-prefix">Rs.</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      placeholder="e.g., 200"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="admin-input with-prefix"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="admin-label">Visibility Options</label>
                  <div className="checkbox-row" style={{ marginTop: '0.5rem' }}>
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formAvailable}
                        onChange={(e) => setFormAvailable(e.target.checked)}
                      />
                      <span>In Stock & Available</span>
                    </label>
                    <label className="admin-checkbox-label" style={{ marginLeft: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={formFeatured}
                        onChange={(e) => setFormFeatured(e.target.checked)}
                      />
                      <span>Featured</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Weight & Price Formula Preview */}
              <div className="admin-formula-preview">
                <div className="formula-header">
                  <HelpCircle size={14} color="var(--primary-700)" />
                  <span className="font-semibold">Authoritative Weight Pricing Rules:</span>
                </div>
                <div className="formula-grid">
                  <div className="formula-pill">250g (0.25kg): <strong>{previewPrice(0.25)}</strong></div>
                  <div className="formula-pill">500g (0.5kg): <strong>{previewPrice(0.5)}</strong></div>
                  <div className="formula-pill">1kg: <strong>{previewPrice(1)}</strong></div>
                  <div className="formula-pill">2kg: <strong>{previewPrice(2)}</strong></div>
                  <div className="formula-pill">5kg: <strong>{previewPrice(5)}</strong></div>
                  <div className="formula-pill">10kg: <strong>{previewPrice(10)}</strong></div>
                  <div className="formula-pill custom-pill">Custom &gt;10kg: <strong>wt × Rs. {formPrice || '0'}</strong></div>
                </div>
              </div>

              {/* Product Image & Gallery Management */}
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                    <ImageIcon size={18} color="#059669" />
                    <span>Product Image &amp; Gallery (سبزی کی تصویر)</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    JPG, PNG, WebP supported
                  </span>
                </div>

                {imageError && (
                  <div className="admin-form-alert alert--danger" style={{ marginBottom: '10px' }}>
                    <AlertCircle size={15} />
                    <span>{imageError}</span>
                  </div>
                )}

                {/* Upload or URL input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)',
                      }}
                    >
                      <Upload size={15} />
                      <span>{selectedImageFile ? 'Change File' : 'Browse Photo from Computer'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedImageFile(file);
                            setImagePreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    {selectedImageFile && (
                      <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>
                        ✓ {selectedImageFile.name} ({(selectedImageFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}

                    {modalMode === 'edit' && editingVeg && selectedImageFile && (
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        disabled={uploadingImage}
                        className="admin-btn admin-btn--primary btn--sm"
                        style={{ marginLeft: 'auto' }}
                      >
                        <Upload size={13} />
                        <span>{uploadingImage ? 'Uploading...' : 'Upload to Gallery'}</span>
                      </button>
                    )}
                  </div>

                  {/* Or Image URL */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>OR Web URL:</span>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={formImageUrl}
                      onChange={(e) => {
                        setFormImageUrl(e.target.value);
                        if (e.target.value.startsWith('http')) {
                          setImagePreviewUrl(e.target.value);
                        }
                      }}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  {/* Selected image preview thumbnail */}
                  {imagePreviewUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #059669' }}
                      />
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46', display: 'block' }}>
                          Ready to attach to this vegetable
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#047857' }}>
                          Will be set as Primary image on save
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Existing gallery images (in edit mode) */}
                  {modalMode === 'edit' && editingVeg && (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                        Active Gallery Photos ({editingVeg.images.length}):
                      </span>

                      {editingVeg.images.length === 0 ? (
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                          No gallery images uploaded yet. Use Browse Photo above to add one.
                        </p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
                          {editingVeg.images.map((img) => (
                            <div
                              key={img.id}
                              style={{
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: img.isPrimary ? '2px solid #059669' : '1px solid #cbd5e1',
                                aspectRatio: '1',
                                backgroundColor: '#000',
                              }}
                            >
                              <img src={img.url} alt="Veg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              {img.isPrimary && (
                                <span style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: '#059669', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                                  Main
                                </span>
                              )}
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  display: 'flex',
                                  justifyContent: 'space-around',
                                  padding: '4px',
                                }}
                              >
                                {!img.isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryImage(img.id)}
                                    style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: 0 }}
                                    title="Make Primary"
                                  >
                                    <Star size={14} fill="currentColor" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteImage(img.id)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                  title="Delete photo"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  disabled={formSubmitting}
                  className="admin-btn admin-btn--primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  {formSubmitting ? (
                    'Saving...'
                  ) : modalMode === 'create' ? (
                    <>
                      <Plus size={16} />
                      <span>Create Vegetable</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>Update Vegetable</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};
