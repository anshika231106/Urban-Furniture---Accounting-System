import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

/**
 * Navigation structure matching MVP.md Section 3.
 * Each section corresponds to a dashboard tab.
 */
const NAV_SECTIONS = [
  {
    id: 'sales',
    label: 'Sales',
    icon: '📊',
    roles: ['Admin', 'Accountant'],
    items: [
      { label: 'Sales Order', path: '/sales/orders', icon: '📋' },
      { label: 'Sale Invoice', path: '/sales/invoices', icon: '🧾' },
      { label: 'Receipt', path: '/sales/receipts', icon: '💰' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    icon: '🛒',
    roles: ['Admin', 'Accountant'],
    items: [
      { label: 'Purchase Order', path: '/purchase/orders', icon: '📦' },
      { label: 'Purchase Bill', path: '/purchase/bills', icon: '📄' },
      { label: 'Payment', path: '/purchase/payments', icon: '💳' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: '📒',
    roles: ['Admin', 'Accountant'],
    items: [
      { label: 'Contact', path: '/account/contacts', icon: '👤' },
      { label: 'Product', path: '/account/products', icon: '📦' },
      { label: 'Analyticals', path: '/account/analytics', icon: '📈' },
      { label: 'Analytical Budget', path: '/account/budgets', icon: '💼' },
      { label: 'Chart of Account', path: '/account/chart-of-accounts', icon: '📑' },
      { label: 'Journals', path: '/account/journals', icon: '📓' },
      { label: 'Journal Entries', path: '/account/journal-entries', icon: '✏️' },
    ],
  },
  {
    id: 'report',
    label: 'Report',
    icon: '📉',
    roles: ['Admin', 'Accountant'],
    items: [
      { label: 'Balancesheet', path: '/reports/balance-sheet', icon: '⚖️' },
      { label: 'Profit and Loss', path: '/reports/profit-loss', icon: '📊' },
      { label: 'Budget Report', path: '/reports/budget', icon: '🎯' },
    ],
  },
];

const ADMIN_ITEMS = [
  { label: 'Create user', path: '/admin/create-user', icon: '👤' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [openSections, setOpenSections] = useState(() => {
    // Auto-open the section containing the current route
    const currentSection = NAV_SECTIONS.find((s) =>
      s.items.some((item) => location.pathname.startsWith(item.path))
    );
    return currentSection ? [currentSection.id] : [];
  });

  const toggleSection = (sectionId) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const filteredSections = NAV_SECTIONS.filter(
    (s) => s.roles.includes(user?.role)
  );

  const userInitial = (user?.name || user?.loginId || 'U')[0].toUpperCase();

  const roleLabel =
    user?.role === 'Admin'
      ? 'Administrator'
      : user?.role === 'Accountant'
        ? 'Invoicing user'
        : 'Contact user';

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`app-sidebar ${isOpen ? 'is-mobile-open' : ''}`}
        id="app-sidebar"
      >
        <div className="sidebar-header">
          <div className="sidebar-logo" aria-hidden="true">
            U
          </div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">Urban Furniture</span>
            <span className="sidebar-brand-sub">Accounting</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-home ${isActive ? 'is-active' : ''}`
            }
            onClick={onClose}
            id="nav-dashboard"
          >
            <span className="sidebar-item-icon" aria-hidden="true">
              🏠
            </span>
            Dashboard
          </NavLink>

          {filteredSections.map((section) => (
            <div
              key={section.id}
              className={`sidebar-section ${
                openSections.includes(section.id) ? 'is-open' : ''
              }`}
            >
              <button
                className="sidebar-section-toggle"
                onClick={() => toggleSection(section.id)}
                aria-expanded={openSections.includes(section.id)}
                id={`nav-section-${section.id}`}
              >
                <span>
                  <span aria-hidden="true" style={{ marginRight: 8 }}>
                    {section.icon}
                  </span>
                  {section.label}
                </span>
                <span className="section-chevron" aria-hidden="true">
                  ▸
                </span>
              </button>
              <div className="sidebar-section-items">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-item ${isActive ? 'is-active' : ''}`
                    }
                    onClick={onClose}
                    id={`nav-${item.path.replace(/\//g, '-').slice(1)}`}
                  >
                    <span className="sidebar-item-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Admin-only items */}
          {user?.role === 'Admin' && (
            <div className="sidebar-section is-open">
              <div className="sidebar-section-items" style={{ maxHeight: 200 }}>
                {ADMIN_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-item ${isActive ? 'is-active' : ''}`
                    }
                    onClick={onClose}
                    id={`nav-${item.path.replace(/\//g, '-').slice(1)}`}
                  >
                    <span className="sidebar-item-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-avatar" aria-hidden="true">
            {userInitial}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {user?.name || user?.loginId}
            </div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            id="logout-btn"
          >
            ⏻
          </button>
        </div>
      </aside>
    </>
  );
}
