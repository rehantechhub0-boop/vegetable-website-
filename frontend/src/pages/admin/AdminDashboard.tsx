import React, { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingBag, Truck, Users, Leaf,
  CheckCircle, AlertCircle, RefreshCw, ArrowUpRight, DollarSign,
  Package, ChevronRight
} from 'lucide-react';

interface DashboardStats {
  ordersCountTotal: number;
  ordersNewCount: number;
  ordersConfirmedCount: number;
  ordersPreparingCount: number;
  ordersOutForDeliveryCount: number;
  ordersDeliveredCount: number;
  ordersCancelledCount: number;
  ordersTodayCount: number;
  salesToday: number;
  salesPaidToday: number;
  salesCodToday: number;
  totalSalesAllTime: number;
  customerCount: number;
  totalVegetables: number;
  orders: {
    total: number;
    new: number;
    confirmed: number;
    preparing: number;
    outForDelivery: number;
    delivered: number;
    cancelled: number;
    todayCount: number;
  };
  financials: {
    salesToday: number;
    salesPaidToday: number;
    salesCodToday: number;
    totalSalesAllTime: number;
  };
  vegetables: {
    total: number;
    available: number;
    outOfStock: number;
    onOffer: number;
  };
  customers: {
    total: number;
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryZone: string;
    grandTotal: number;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    itemsCount: number;
    createdAt: string;
  }>;
}

interface AdminDashboardProps {
  onNavigateSection: (section: string, param?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateSection }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/dashboard', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load dashboard metrics.');
      }
      setStats(data.data);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="admin-loading-state">
        <RefreshCw size={28} className="spin-icon" color="var(--primary-600)" />
        <p>Loading real-time Muzaffargarh operations metrics...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="admin-error-box">
        <AlertCircle size={24} color="var(--status-danger)" />
        <div>
          <h4>Failed to load dashboard</h4>
          <p>{error}</p>
        </div>
        <button type="button" onClick={fetchStats} className="admin-btn admin-btn--secondary">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const s = stats!;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
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
    <div className="admin-dashboard-container">
      {/* Top Header / Actions */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Executive Dashboard</h1>
          <p className="admin-page-subtitle">
            Muzaffargarh Fresh Vegetable Delivery — Live Sales & Order Fulfillment Overview
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="admin-btn admin-btn--secondary"
            title="Refresh statistics"
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('vegetables')}
            className="admin-btn admin-btn--primary"
          >
            <Leaf size={15} />
            <span>Manage Vegetables</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        {/* Today's Sales */}
        <div className="admin-kpi-card">
          <div className="kpi-icon-wrapper kpi-icon--emerald">
            <DollarSign size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Today's Total Sales</span>
            <div className="kpi-value">Rs. {s.salesToday.toLocaleString()}</div>
            <div className="kpi-subtext">
              <span className="text-success">Paid: Rs. {s.salesPaidToday.toLocaleString()}</span>
              {' · '}
              <span className="text-muted">COD: Rs. {s.salesCodToday.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="admin-kpi-card">
          <div className="kpi-icon-wrapper kpi-icon--blue">
            <ShoppingBag size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Orders Placed Today</span>
            <div className="kpi-value">{s.ordersTodayCount}</div>
            <div className="kpi-subtext">
              <span className="text-brand font-semibold">{s.ordersNewCount} new</span> awaiting confirmation
            </div>
          </div>
        </div>

        {/* Out For Delivery */}
        <div className="admin-kpi-card">
          <div className="kpi-icon-wrapper kpi-icon--amber">
            <Truck size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Out for Delivery</span>
            <div className="kpi-value">{s.ordersOutForDeliveryCount}</div>
            <div className="kpi-subtext">
              Active couriers in Muzaffargarh
            </div>
          </div>
        </div>

        {/* All-time Revenue */}
        <div className="admin-kpi-card">
          <div className="kpi-icon-wrapper kpi-icon--purple">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">All-Time Revenue</span>
            <div className="kpi-value">Rs. {s.totalSalesAllTime.toLocaleString()}</div>
            <div className="kpi-subtext">
              From {s.ordersCountTotal} lifetime orders (excl. cancelled)
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Pipeline & Inventory */}
      <div className="admin-two-col-grid">
        {/* Order Fulfillment Pipeline */}
        <div className="admin-panel-card">
          <div className="admin-panel-card__header">
            <div>
              <h3 className="panel-title">Fulfillment Pipeline</h3>
              <p className="panel-subtitle">Real-time status breakdown across all orders</p>
            </div>
            <button
              type="button"
              className="admin-link-btn"
              onClick={() => onNavigateSection('orders')}
            >
              View Orders <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="admin-status-pipeline">
            <div className="pipeline-item" onClick={() => onNavigateSection('orders', 'NEW')}>
              <div className="pipeline-item__indicator indicator--new" />
              <div className="pipeline-item__info">
                <span className="pipeline-title">New</span>
                <span className="pipeline-count">{s.ordersNewCount}</span>
              </div>
            </div>

            <div className="pipeline-item" onClick={() => onNavigateSection('orders', 'CONFIRMED')}>
              <div className="pipeline-item__indicator indicator--confirmed" />
              <div className="pipeline-item__info">
                <span className="pipeline-title">Confirmed</span>
                <span className="pipeline-count">{s.ordersConfirmedCount}</span>
              </div>
            </div>

            <div className="pipeline-item" onClick={() => onNavigateSection('orders', 'PREPARING')}>
              <div className="pipeline-item__indicator indicator--preparing" />
              <div className="pipeline-item__info">
                <span className="pipeline-title">Preparing</span>
                <span className="pipeline-count">{s.ordersPreparingCount}</span>
              </div>
            </div>

            <div className="pipeline-item" onClick={() => onNavigateSection('orders', 'OUT_FOR_DELIVERY')}>
              <div className="pipeline-item__indicator indicator--delivery" />
              <div className="pipeline-item__info">
                <span className="pipeline-title">Out for Delivery</span>
                <span className="pipeline-count">{s.ordersOutForDeliveryCount}</span>
              </div>
            </div>

            <div className="pipeline-item" onClick={() => onNavigateSection('orders', 'DELIVERED')}>
              <div className="pipeline-item__indicator indicator--delivered" />
              <div className="pipeline-item__info">
                <span className="pipeline-title">Delivered</span>
                <span className="pipeline-count">{s.ordersDeliveredCount}</span>
              </div>
            </div>

            <div className="pipeline-item" onClick={() => onNavigateSection('orders', 'CANCELLED')}>
              <div className="pipeline-item__indicator indicator--cancelled" />
              <div className="pipeline-item__info">
                <span className="pipeline-title">Cancelled</span>
                <span className="pipeline-count">{s.ordersCancelledCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Store & Inventory Summary */}
        <div className="admin-panel-card">
          <div className="admin-panel-card__header">
            <div>
              <h3 className="panel-title">Inventory & Audience</h3>
              <p className="panel-subtitle">Muzaffargarh vegetable catalog & customer base</p>
            </div>
            <button
              type="button"
              className="admin-link-btn"
              onClick={() => onNavigateSection('vegetables')}
            >
              Vegetables <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="inventory-summary-list">
            <div className="inv-summary-row">
              <div className="inv-summary-left">
                <Leaf size={18} color="var(--primary-600)" />
                <span>Total Vegetable Varieties</span>
              </div>
              <span className="inv-summary-val">{s.vegetables.total}</span>
            </div>

            <div className="inv-summary-row">
              <div className="inv-summary-left">
                <CheckCircle size={18} color="var(--status-success)" />
                <span>Available / In Stock</span>
              </div>
              <span className="inv-summary-val text-success">{s.vegetables.available}</span>
            </div>

            <div className="inv-summary-row">
              <div className="inv-summary-left">
                <AlertCircle size={18} color="var(--status-danger)" />
                <span>Out of Stock</span>
              </div>
              <span className="inv-summary-val text-danger">{s.vegetables.outOfStock}</span>
            </div>

            <div className="inv-summary-row">
              <div className="inv-summary-left">
                <TrendingUp size={18} color="var(--accent-600)" />
                <span>On Promotional Offer</span>
              </div>
              <span className="inv-summary-val text-accent">{s.vegetables.onOffer}</span>
            </div>

            <div className="inv-summary-row" onClick={() => onNavigateSection('customers')} style={{ cursor: 'pointer' }}>
              <div className="inv-summary-left">
                <Users size={18} color="var(--status-info)" />
                <span>Registered Customers</span>
              </div>
              <span className="inv-summary-val">{s.customerCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="admin-panel-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-panel-card__header">
          <div>
            <h3 className="panel-title">Recent Orders</h3>
            <p className="panel-subtitle">Latest 10 orders placed on the platform</p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => onNavigateSection('orders')}
          >
            All Orders ({s.ordersCountTotal})
          </button>
        </div>

        {s.recentOrders.length === 0 ? (
          <div className="admin-empty-table">
            <Package size={36} color="var(--text-light)" />
            <p>No orders placed yet.</p>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Delivery Area</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {s.recentOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <span className="font-mono font-bold text-brand">
                        {ord.orderNumber}
                      </span>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span className="font-semibold text-headline">{ord.customerName}</span>
                        <span className="text-muted text-xs">{ord.customerPhone}</span>
                      </div>
                    </td>
                    <td>{ord.deliveryZone}</td>
                    <td>{ord.itemsCount} item{ord.itemsCount !== 1 ? 's' : ''}</td>
                    <td>
                      <span className="font-bold text-headline">Rs. {ord.grandTotal}</span>
                    </td>
                    <td>
                      <span className={`payment-pill ${ord.paymentMethod === 'COD' ? 'pill-cod' : 'pill-online'}`}>
                        {ord.paymentMethod} ({ord.paymentStatus})
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusBadgeClass(ord.orderStatus)}`}>
                        {ord.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onNavigateSection('orders', ord.orderNumber)}
                        className="admin-table-action-btn"
                        title="View order details"
                      >
                        Details <ChevronRight size={14} />
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
  );
};
