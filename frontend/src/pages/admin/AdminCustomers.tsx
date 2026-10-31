import React, { useState, useEffect } from 'react';
import {
  Users, Search, X, ShoppingBag, Eye,
  ChevronRight, Phone, Mail, Clock, AlertCircle
} from 'lucide-react';

interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  ordersCount: number;
}

interface CustomerDetail extends CustomerSummary {
  addresses: Array<{
    id: string;
    streetAddress: string;
    isDefault: boolean;
  }>;
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    grandTotal: number;
    orderStatus: string;
    paymentMethod: string;
    createdAt: string;
  }>;
}

interface AdminCustomersProps {
  onNavigateOrder?: (orderNumber: string) => void;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({ onNavigateOrder }) => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selected customer drawer
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set('search', search.trim());
      q.set('page', String(page));
      q.set('limit', '25');

      const res = await fetch(`/api/v1/admin/customers?${q.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve customers.');
      }
      setCustomers(data.customers || data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading customer directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const loadCustomerDetails = async (customerId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/customers/${customerId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch customer profile.');
      }
      setSelectedCustomer(data.customer);
    } catch (err: any) {
      alert(`Could not load customer: ${err.message}`);
    }
  };

  return (
    <div className="admin-customers-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Customer Directory</h1>
          <p className="admin-page-subtitle">
            Registered customer accounts in Muzaffargarh — order frequencies and delivery profiles (privacy protected)
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="admin-filter-bar">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); fetchCustomers(); }}
          className="admin-search-form"
        >
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search customer by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); fetchCustomers(); }}
              className="clear-search-btn"
            >
              <X size={14} />
            </button>
          )}
        </form>
        <span className="results-count-text">
          Showing {customers.length} of {total} registered customers
        </span>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="admin-loading-state">
          <Clock size={28} className="spin-icon" color="var(--primary-600)" />
          <p>Loading customer directory...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <AlertCircle size={22} color="var(--status-danger)" />
          <div>
            <h4>Failed to load customers</h4>
            <p>{error}</p>
          </div>
          <button type="button" onClick={fetchCustomers} className="admin-btn admin-btn--secondary">
            Retry
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="admin-empty-table">
          <Users size={40} color="var(--text-light)" />
          <h3>No customers found</h3>
          <p>No customer profiles match your search criteria.</p>
        </div>
      ) : (
        <div className="admin-panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>Joined Date</th>
                  <th>Total Orders</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="customer-name-col">
                        <span className="font-semibold text-headline">{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info-col text-sm">
                        {c.phone && (
                          <div className="contact-item">
                            <Phone size={13} color="var(--primary-600)" />
                            <span className="font-mono">{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="contact-item text-xs text-muted">
                            <Mail size={12} />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-muted">
                        {new Date(c.createdAt).toLocaleDateString('en-PK', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td>
                      <span className="orders-count-badge">
                        {c.ordersCount} order{c.ordersCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => loadCustomerDetails(c.id)}
                        className="admin-btn admin-btn--secondary btn--sm"
                      >
                        <Eye size={13} /> View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedCustomer(null)}>
          <div
            className="admin-modal-window"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640 }}
          >
            <div className="admin-modal-header">
              <div>
                <span className="text-xs text-muted uppercase">Customer Profile</span>
                <h3 className="modal-title font-bold text-lg text-headline">{selectedCustomer.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div className="detail-info-grid">
                <div className="detail-info-card">
                  <h4 className="info-card-title">Contact & Identifiers</h4>
                  <div className="info-card-item">
                    <span className="label">Phone:</span>
                    <span className="value font-mono">{selectedCustomer.phone || '—'}</span>
                  </div>
                  <div className="info-card-item">
                    <span className="label">Email:</span>
                    <span className="value">{selectedCustomer.email || '—'}</span>
                  </div>
                  <div className="info-card-item">
                    <span className="label">Member Since:</span>
                    <span className="value">
                      {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="detail-info-card">
                  <h4 className="info-card-title">Saved Muzaffargarh Addresses</h4>
                  {selectedCustomer.addresses.length === 0 ? (
                    <p className="text-xs text-muted">No saved addresses on file.</p>
                  ) : (
                    selectedCustomer.addresses.map((addr) => (
                      <div key={addr.id} className="text-xs mb-2">
                        <span className="font-semibold">{addr.streetAddress}</span>
                        {addr.isDefault && (
                          <span className="badge-primary-img ml-2">Default</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Order History */}
              <div className="customer-order-history-box mt-4">
                <h4 className="info-card-title">
                  <ShoppingBag size={15} /> Order History ({selectedCustomer.ordersCount} Total)
                </h4>

                {selectedCustomer.recentOrders.length === 0 ? (
                  <p className="text-xs text-muted">No past orders found.</p>
                ) : (
                  <div className="admin-table-responsive">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCustomer.recentOrders.map((ord) => (
                          <tr key={ord.id}>
                            <td>
                              <span className="font-mono font-semibold text-brand">
                                {ord.orderNumber}
                              </span>
                            </td>
                            <td className="text-xs text-muted">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </td>
                            <td className="font-bold">Rs. {ord.grandTotal}</td>
                            <td>
                              <span className="status-pill status-pill--xs badge-neutral">
                                {ord.orderStatus}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  if (onNavigateOrder) onNavigateOrder(ord.orderNumber);
                                }}
                                className="admin-icon-btn"
                                title="Open in Orders"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
