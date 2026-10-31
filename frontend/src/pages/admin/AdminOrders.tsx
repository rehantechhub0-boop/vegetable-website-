import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Filter, Eye, X,
  Clock, CheckCircle, AlertTriangle, DollarSign,
  MapPin, User, AlertCircle
} from 'lucide-react';

interface OrderItem {
  id: string;
  vegetableName: string;
  weightGrams: number;
  weightLabel: string;
  unitPricePerKg: number;
  itemTotal: number;
}

interface StatusHistoryEntry {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
}

interface OrderSummary {
  id: number;
  orderNumber: string;
  uuid: string;
  customerName: string;
  customerPhone: string;
  deliveryZone: string;
  deliveryFee: number;
  itemsTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  itemsCount: number;
  createdAt: string;
}

interface OrderDetail extends OrderSummary {
  streetAddress: string;
  notes: string | null;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
}

interface AdminOrdersProps {
  initialFilterStatus?: string;
  initialOrderNumber?: string;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  initialFilterStatus,
  initialOrderNumber,
}) => {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialOrderNumber || '');
  const [statusFilter, setStatusFilter] = useState(initialFilterStatus || '');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selected Order Detail
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [confirmCancelModal, setConfirmCancelModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set('search', search.trim());
      if (statusFilter) q.set('orderStatus', statusFilter);
      if (paymentFilter) q.set('paymentStatus', paymentFilter);
      q.set('page', String(page));
      q.set('limit', '25');

      const res = await fetch(`/api/v1/admin/orders?${q.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve orders.');
      }
      setOrders(data.orders || data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentFilter, page]);

  useEffect(() => {
    if (initialOrderNumber) {
      loadOrderDetails(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const loadOrderDetails = async (orderIdentifier: string | number) => {
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderIdentifier}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve order details.');
      }
      setSelectedOrder(data.order);
      setSelectedNewStatus(data.order.orderStatus);
    } catch (err: any) {
      alert(`Could not load order: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (statusToSet: string) => {
    if (!selectedOrder) return;

    if (statusToSet === 'CANCELLED' && !confirmCancelModal) {
      setConfirmCancelModal(true);
      return;
    }

    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${selectedOrder.orderNumber}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: statusToSet,
          note: statusNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Status transition rejected.');
      }

      setNotification(`Order ${selectedOrder.orderNumber} transitioned to ${statusToSet}.`);
      setTimeout(() => setNotification(null), 4000);
      setConfirmCancelModal(false);
      setStatusNote('');

      // Reload order details & table
      await loadOrderDetails(selectedOrder.orderNumber);
      fetchOrders();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUpdatePaymentStatus = async (newPayStatus: string) => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/v1/admin/orders/${selectedOrder.orderNumber}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: newPayStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Payment update failed.');
      }
      await loadOrderDetails(selectedOrder.orderNumber);
      fetchOrders();
    } catch (err: any) {
      alert(`Payment update error: ${err.message}`);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'NEW': return 'badge-new';
      case 'CONFIRMED': return 'badge-confirmed';
      case 'PREPARING': return 'badge-preparing';
      case 'OUT_FOR_DELIVERY': return 'badge-delivery';
      case 'DELIVERED': return 'badge-delivered';
      case 'CANCELLED': return 'badge-cancelled';
      default: return 'badge-neutral';
    }
  };

  return (
    <div className="admin-orders-page">
      {notification && (
        <div className="admin-toast-banner">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Order Management & Fulfillment</h1>
          <p className="admin-page-subtitle">
            Track customer orders across Muzaffargarh — status transitions, audit timeline, and delivery dispatch
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filter-bar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); fetchOrders(); }}
          className="admin-search-form"
          style={{ minWidth: 260 }}
        >
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search Order # or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); fetchOrders(); }}
              className="clear-search-btn"
            >
              <X size={14} />
            </button>
          )}
        </form>

        <div className="filter-select-group">
          <Filter size={15} color="var(--text-muted)" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="admin-select"
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="NEW">New Orders</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="admin-select"
          >
            <option value="">All Payment Statuses</option>
            <option value="PENDING">Payment Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <span className="results-count-text" style={{ marginLeft: 'auto' }}>
          Total {total} orders
        </span>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="admin-loading-state">
          <Clock size={28} className="spin-icon" color="var(--primary-600)" />
          <p>Loading orders from database...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <AlertCircle size={22} color="var(--status-danger)" />
          <div>
            <h4>Failed to load orders</h4>
            <p>{error}</p>
          </div>
          <button type="button" onClick={fetchOrders} className="admin-btn admin-btn--secondary">
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-empty-table">
          <ShoppingBag size={40} color="var(--text-light)" />
          <h3>No matching orders found</h3>
          <p>No orders match the selected filters or search terms.</p>
        </div>
      ) : (
        <div className="admin-panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date & Time</th>
                  <th>Customer Info</th>
                  <th>Delivery Area</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <span className="font-mono font-bold text-brand">
                        {ord.orderNumber}
                      </span>
                    </td>
                    <td>
                      <div className="date-time-cell text-xs text-muted">
                        {new Date(ord.createdAt).toLocaleDateString('en-PK', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        <br />
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span className="font-semibold text-headline">{ord.customerName}</span>
                        <span className="text-muted text-xs font-mono">{ord.customerPhone}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{ord.deliveryZone}</div>
                    </td>
                    <td>
                      <span className="font-bold text-headline">Rs. {ord.grandTotal}</span>
                      <span className="text-xs text-muted block">({ord.itemsCount} items)</span>
                    </td>
                    <td>
                      <span className={`payment-pill ${ord.paymentMethod === 'COD' ? 'pill-cod' : 'pill-online'}`}>
                        {ord.paymentMethod}
                      </span>
                      <span className="text-xs text-muted block mt-1">{ord.paymentStatus}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusBadge(ord.orderStatus)}`}>
                        {ord.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => loadOrderDetails(ord.orderNumber)}
                        className="admin-btn admin-btn--secondary btn--sm"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="admin-modal-window admin-order-detail-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 780 }}
          >
            <div className="admin-modal-header">
              <div>
                <span className="text-xs font-mono uppercase text-muted">Order Details</span>
                <h2 className="modal-title font-mono text-brand font-bold text-xl">
                  {selectedOrder.orderNumber}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="order-detail-content">
              {/* Status and Action Ribbon */}
              <div className="order-action-ribbon">
                <div>
                  <span className="text-xs text-muted">Current Status:</span>
                  <div className="mt-1">
                    <span className={`status-pill ${getStatusBadge(selectedOrder.orderStatus)}`}>
                      {selectedOrder.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Transition Status Controls */}
                <div className="status-transition-controls">
                  <select
                    value={selectedNewStatus}
                    onChange={(e) => setSelectedNewStatus(e.target.value)}
                    className="admin-select font-semibold"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PREPARING">PREPARING</option>
                    <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>

                  <button
                    type="button"
                    disabled={statusUpdating || selectedNewStatus === selectedOrder.orderStatus}
                    onClick={() => handleUpdateStatus(selectedNewStatus)}
                    className="admin-btn admin-btn--primary btn--sm"
                  >
                    {statusUpdating ? 'Updating...' : 'Apply Transition'}
                  </button>
                </div>
              </div>

              {/* Status Note input */}
              {selectedNewStatus !== selectedOrder.orderStatus && (
                <div className="transition-note-box">
                  <input
                    type="text"
                    placeholder="Optional audit note (e.g. Dispatched with Rider Ali)..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="admin-input text-sm"
                  />
                </div>
              )}

              {/* Customer & Delivery Information Grid */}
              <div className="detail-info-grid">
                <div className="detail-info-card">
                  <h4 className="info-card-title">
                    <User size={15} /> Customer Details
                  </h4>
                  <div className="info-card-item">
                    <span className="label">Name:</span>
                    <span className="value font-semibold">{selectedOrder.customerName}</span>
                  </div>
                  <div className="info-card-item">
                    <span className="label">Phone:</span>
                    <a href={`tel:${selectedOrder.customerPhone}`} className="value font-mono text-brand">
                      {selectedOrder.customerPhone}
                    </a>
                  </div>
                </div>

                <div className="detail-info-card">
                  <h4 className="info-card-title">
                    <MapPin size={15} /> Muzaffargarh Delivery
                  </h4>
                  <div className="info-card-item">
                    <span className="label">Area Zone:</span>
                    <span className="value font-semibold">{selectedOrder.deliveryZone}</span>
                  </div>
                  <div className="info-card-item">
                    <span className="label">Address:</span>
                    <span className="value">{selectedOrder.streetAddress}</span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="info-card-item mt-1">
                      <span className="label">Delivery Note:</span>
                      <span className="value text-muted italic">{selectedOrder.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items Table with Weight & Price Snapshots */}
              <div className="order-items-detail-card">
                <h4 className="info-card-title">
                  <ShoppingBag size={15} /> Purchased Vegetables (Historical Price Snapshots)
                </h4>
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Vegetable</th>
                      <th>Selected Weight</th>
                      <th>Snapshot Rate</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="font-semibold">{item.vegetableName}</td>
                        <td>
                          <span className="weight-badge">{item.weightLabel}</span>
                          <span className="text-muted text-xs ml-1 font-mono">({item.weightGrams}g)</span>
                        </td>
                        <td>Rs. {item.unitPricePerKg} / kg</td>
                        <td style={{ textAlign: 'right' }} className="font-bold text-headline">
                          Rs. {item.itemTotal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right' }} className="text-muted font-semibold">
                        Items Subtotal:
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-bold">
                        Rs. {selectedOrder.itemsTotal}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right' }} className="text-muted font-semibold">
                        Muzaffargarh Delivery Fee:
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-bold">
                        Rs. {selectedOrder.deliveryFee}
                      </td>
                    </tr>
                    <tr className="grand-total-row">
                      <td colSpan={3} style={{ textAlign: 'right' }} className="font-bold text-headline">
                        Grand Total:
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-bold text-headline text-lg text-brand">
                        Rs. {selectedOrder.grandTotal}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Details & Manual Reconciliation (COD) */}
              <div className="payment-reconciliation-card">
                <div className="flex-between">
                  <div>
                    <span className="text-xs text-muted">Payment Method</span>
                    <h4 className="font-semibold text-headline mt-1">
                      {selectedOrder.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online / Advance'}
                    </h4>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Current Payment Status</span>
                    <div className="mt-1">
                      <span className={`payment-pill ${selectedOrder.paymentStatus === 'PAID' ? 'pill-paid' : 'pill-pending'}`}>
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>
                  </div>
                  {/* Mark as paid toggle */}
                  {selectedOrder.paymentStatus !== 'PAID' && (
                    <button
                      type="button"
                      onClick={() => handleUpdatePaymentStatus('PAID')}
                      className="admin-btn admin-btn--secondary btn--sm"
                      title="Confirm payment received"
                    >
                      <DollarSign size={13} /> Mark Paid (Collected)
                    </button>
                  )}
                </div>
              </div>

              {/* Audit Timeline / Status History */}
              <div className="audit-timeline-section">
                <h4 className="info-card-title">
                  <Clock size={15} /> Order Audit Trail & Status Timeline
                </h4>
                <div className="timeline-trail">
                  {selectedOrder.statusHistory.map((entry, idx) => (
                    <div key={entry.id || idx} className="timeline-node">
                      <div className="timeline-dot" />
                      <div className="timeline-node-content">
                        <div className="timeline-header">
                          <span className={`status-pill status-pill--xs ${getStatusBadge(entry.status)}`}>
                            {entry.status}
                          </span>
                          <span className="text-xs text-muted font-mono">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="timeline-note text-sm text-body">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Order Cancellation */}
      {confirmCancelModal && (
        <div className="admin-modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="admin-modal-window" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <div className="modal-header-info">
                <AlertTriangle size={20} color="var(--status-danger)" />
                <h3 className="modal-title text-danger">Confirm Order Cancellation</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCancelModal(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p className="text-body text-sm leading-relaxed">
                Are you sure you want to cancel order <strong>{selectedOrder?.orderNumber}</strong>?
                This action is written to the audit log and cannot be reverted without customer re-confirmation.
              </p>
              <div className="modal-actions-footer mt-4">
                <button
                  type="button"
                  onClick={() => setConfirmCancelModal(false)}
                  className="admin-btn admin-btn--secondary"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => handleUpdateStatus('CANCELLED')}
                  className="admin-btn admin-btn--danger"
                >
                  {statusUpdating ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
