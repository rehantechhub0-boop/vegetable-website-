import React, { useState } from 'react';
import {
  LayoutDashboard, Leaf, ShoppingBag, Users, MapPin, Tag,
  Layout, MessageCircle, CreditCard, Globe, UserCheck,
  LogOut, ExternalLink, Menu, X, Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

// Admin Sub-pages
import { AdminDashboard } from './AdminDashboard';
import { AdminVegetables } from './AdminVegetables';
import { AdminOrders } from './AdminOrders';
import { AdminCustomers } from './AdminCustomers';
import { AdminDeliverySettings } from './AdminDeliverySettings';
import { AdminOffers } from './AdminOffers';
import { AdminHomepage } from './AdminHomepage';
import { AdminWhatsApp } from './AdminWhatsApp';
import { AdminPayment } from './AdminPayment';
import { AdminWebsiteSettings } from './AdminWebsiteSettings';
import { AdminAccount } from './AdminAccount';
import { AdminStaff } from './AdminStaff';

export type AdminSection =
  | 'dashboard'
  | 'vegetables'
  | 'orders'
  | 'customers'
  | 'delivery'
  | 'offers'
  | 'homepage'
  | 'whatsapp'
  | 'payment'
  | 'website'
  | 'account'
  | 'staff';

interface AdminLayoutProps {
  currentSection: AdminSection;
  onNavigateSection: (section: AdminSection, param?: string) => void;
  onNavigateStore: () => void;
  subParam?: string | null;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentSection,
  onNavigateSection,
  onNavigateStore,
  subParam,
}) => {
  const { user, logout } = useAuthStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'vegetables', label: 'Vegetables', icon: <Leaf size={18} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
    { id: 'customers', label: 'Customers', icon: <Users size={18} /> },
    { id: 'delivery', label: 'Delivery Settings', icon: <MapPin size={18} /> },
    { id: 'offers', label: 'Offers & Discounts', icon: <Tag size={18} /> },
    { id: 'homepage', label: 'Homepage Content', icon: <Layout size={18} /> },
    { id: 'whatsapp', label: 'WhatsApp Settings', icon: <MessageCircle size={18} /> },
    { id: 'payment', label: 'Payment Settings', icon: <CreditCard size={18} /> },
    { id: 'website', label: 'Website Settings', icon: <Globe size={18} /> },
    { id: 'staff', label: 'Staff & Roles (عملہ)', icon: <Users size={18} /> },
    { id: 'account', label: 'Admin Account', icon: <UserCheck size={18} /> },
  ];

  const handleLogout = async () => {
    if (window.confirm('Log out of administrator panel?')) {
      await logout();
      onNavigateStore();
    }
  };

  const renderActiveSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <AdminDashboard onNavigateSection={(sec, param) => onNavigateSection(sec as AdminSection, param)} />;
      case 'vegetables':
        return <AdminVegetables />;
      case 'orders':
        return (
          <AdminOrders
            initialFilterStatus={subParam && ['NEW', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(subParam) ? subParam : undefined}
            initialOrderNumber={subParam && subParam.startsWith('ORD-') ? subParam : undefined}
          />
        );
      case 'customers':
        return <AdminCustomers onNavigateOrder={(orderNum) => onNavigateSection('orders', orderNum)} />;
      case 'delivery':
        return <AdminDeliverySettings />;
      case 'offers':
        return <AdminOffers />;
      case 'homepage':
        return <AdminHomepage />;
      case 'whatsapp':
        return <AdminWhatsApp />;
      case 'payment':
        return <AdminPayment />;
      case 'website':
        return <AdminWebsiteSettings />;
      case 'account':
        return <AdminAccount />;
      case 'staff':
        return <AdminStaff />;
      default:
        return <AdminDashboard onNavigateSection={(sec, param) => onNavigateSection(sec as AdminSection, param)} />;
    }
  };

  return (
    <div className="admin-app-root">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR NAVIGATION ────────────────────────────────────── */}
      <aside className={`admin-sidebar ${mobileSidebarOpen ? 'admin-sidebar--mobile-open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <div className="admin-brand-icon">
              <Leaf size={20} color="#fff" />
            </div>
            <div className="admin-brand-text">
              <span className="brand-title">Muzaffargarh</span>
              <span className="brand-badge">ADMIN PANEL</span>
            </div>
          </div>
          <button
            type="button"
            className="mobile-close-sidebar-btn"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-nav-menu">
          <span className="nav-section-label">OPERATIONS</span>
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigateSection(item.id as AdminSection);
                setMobileSidebarOpen(false);
              }}
              className={`admin-nav-item ${currentSection === item.id ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}

          <span className="nav-section-label mt-3">CATALOG & PROMOTIONS</span>
          {navItems.slice(4, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigateSection(item.id as AdminSection);
                setMobileSidebarOpen(false);
              }}
              className={`admin-nav-item ${currentSection === item.id ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}

          <span className="nav-section-label mt-3">SYSTEM & INTEGRATIONS</span>
          {navItems.slice(6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigateSection(item.id as AdminSection);
                setMobileSidebarOpen(false);
              }}
              className={`admin-nav-item ${currentSection === item.id ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <button
            type="button"
            onClick={onNavigateStore}
            className="admin-footer-btn"
            title="Switch to customer storefront"
          >
            <ExternalLink size={16} />
            <span>View Public Store</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────── */}
      <div className="admin-main-wrapper">
        {/* Admin Top Header */}
        <header className="admin-top-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-mobile-toggle-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="admin-location-pill">
              <Shield size={14} color="var(--primary-600)" />
              <span>Muzaffargarh Fresh Vegetables · Certified Admin Area</span>
            </div>
          </div>

          <div className="admin-header-right">
            {/* View store link */}
            <button
              type="button"
              onClick={onNavigateStore}
              className="admin-store-link-btn"
            >
              <ExternalLink size={14} />
              <span>Customer Storefront</span>
            </button>

            {/* Current Admin user tag */}
            <div
              className="admin-user-pill"
              onClick={() => onNavigateSection('account')}
              title="Click to manage account"
            >
              <div className="admin-avatar">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="admin-user-info-text">
                <span className="user-name">{user?.name || 'Administrator'}</span>
                <span className="user-role">ADMIN</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="admin-logout-btn"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="admin-content-viewport">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
};
