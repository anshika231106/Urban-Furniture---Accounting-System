import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './AppLayout.css';

/**
 * Main app shell with sidebar + content area.
 * All authenticated pages render inside <Outlet />.
 */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout" id="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="app-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <button
            className="mobile-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            id="mobile-menu-btn"
          >
            ☰
          </button>
          <span className="mobile-header-title">Urban Furniture</span>
        </div>

        <div className="app-main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
