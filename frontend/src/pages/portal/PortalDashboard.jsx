import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Portal.css';

// ── Document table sub-component (uses main app's .data-table + .badge classes) ──
function DocTable({ documents, onPay, type }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="portal-empty">
        <div className="portal-empty-icon">🍃</div>
        <p style={{ fontWeight: 'var(--weight-medium)', color: 'var(--ink-secondary)', marginBottom: 4 }}>
          No {type === 'invoice' ? 'invoices' : 'bills'} found
        </p>
        <p className="text-small text-muted">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Reference</th>
              <th>Date</th>
              <th>Due Date</th>
              <th className="col-monetary">Total</th>
              <th className="col-monetary">Amount Due</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td style={{ fontWeight: 'var(--weight-medium)' }}>
                  {doc.invoiceNumber || doc.billNumber}
                </td>
                <td className="text-muted text-small">{doc.reference || '—'}</td>
                <td className="text-small">{doc.invoiceDate || doc.billDate || '—'}</td>
                <td className="text-small">{doc.dueDate || '—'}</td>
                <td className="col-monetary">
                  ₹{Number(doc.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="col-monetary" style={{
                  color: doc.amountDue > 0 ? 'var(--status-unpaid)' : 'var(--status-paid)',
                  fontWeight: 'var(--weight-semibold)',
                }}>
                  ₹{Number(doc.amountDue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${
                    doc.status === 'Paid' ? 'badge-paid'
                    : doc.status === 'Partial' ? 'badge-partial'
                    : 'badge-unpaid'
                  }`}>
                    {doc.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {doc.status !== 'Paid' ? (
                    <button
                      className="btn btn-primary btn-sm btn-pay"
                      onClick={() => onPay(doc.id)}
                    >
                      {type === 'invoice' ? 'Pay Now' : 'Mark Received'}
                    </button>
                  ) : (
                    <span className="text-small text-muted" style={{ paddingRight: 8 }}>✓ Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Portal Dashboard ──────────────────────────────────────────────────────
export default function PortalDashboard() {
  const { user, logout } = useAuth();
  const [bills, setBills] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('invoices');

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('uf_token');
      const res = await fetch('/api/portal/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load documents');
      }
      const data = await res.json();
      setBills(data.bills || []);
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handlePay = async (docId) => {
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/portal/documents/${docId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Payment failed');
      }
      await fetchDocs();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalDue = useMemo(() =>
    [...bills, ...invoices].reduce((acc, doc) => acc + (Number(doc.amountDue) || 0), 0),
    [bills, invoices]
  );

  const totalPaid = useMemo(() =>
    [...bills, ...invoices].reduce((acc, doc) =>
      acc + (Number(doc.total) - Number(doc.amountDue) || 0), 0),
    [bills, invoices]
  );

  const unpaidCount = useMemo(() =>
    [...bills, ...invoices].filter(d => d.status !== 'Paid').length,
    [bills, invoices]
  );

  const userInitial = (user?.name || user?.loginId || 'C')[0].toUpperCase();

  return (
    <div className="portal-layout">
      {/* ── Sidebar ── */}
      <aside className="portal-sidebar">
        <div className="portal-sidebar-header">
          <div className="portal-sidebar-logo">U</div>
          <div className="portal-sidebar-brand">
            <span className="portal-sidebar-brand-name">Urban Furniture</span>
            <span className="portal-sidebar-brand-sub">Client Portal</span>
          </div>
        </div>

        <nav className="portal-sidebar-nav">
          <div className="portal-nav-label">Documents</div>
          <button
            className={`portal-nav-item ${activeTab === 'invoices' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <span className="portal-nav-item-icon">🧾</span>
            My Invoices
          </button>
          <button
            className={`portal-nav-item ${activeTab === 'bills' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('bills')}
          >
            <span className="portal-nav-item-icon">📄</span>
            My Bills
          </button>
        </nav>

        <div className="portal-sidebar-footer">
          <div className="portal-user-avatar">{userInitial}</div>
          <div className="portal-user-info">
            <div className="portal-user-name">{user?.name || user?.loginId}</div>
            <div className="portal-user-role">Contact user</div>
          </div>
          <button
            className="portal-logout-btn"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="portal-main">
        <div className="portal-main-content">
          {/* Page header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">
                {activeTab === 'invoices' ? 'My Invoices' : 'My Bills'}
              </h1>
              <p className="text-small text-muted" style={{ marginTop: 4 }}>
                {activeTab === 'invoices'
                  ? 'Invoices issued to you by Urban Furniture.'
                  : 'Bills raised by you against Urban Furniture.'}
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="portal-summary-strip">
            <div className="portal-summary-card">
              <div className="portal-summary-label">Outstanding Balance</div>
              <div className="portal-summary-value is-due">
                ₹{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="portal-summary-card">
              <div className="portal-summary-label">Total Paid</div>
              <div className="portal-summary-value is-paid">
                ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="portal-summary-card">
              <div className="portal-summary-label">Open Documents</div>
              <div className="portal-summary-value">{unpaidCount}</div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>
              <span className="alert-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
              <div style={{
                width: 32, height: 32, border: '3px solid var(--border-subtle)',
                borderTop: '3px solid var(--accent-primary)',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
            </div>
          ) : (
            <div className="portal-section">
              {activeTab === 'invoices' ? (
                <>
                  <div className="portal-section-header">
                    <div className="portal-section-icon">🧾</div>
                    <div>
                      <div className="portal-section-title">Invoices to Pay</div>
                      <div className="portal-section-subtitle">
                        {invoices.filter(i => i.status !== 'Paid').length} unpaid
                        {' '}· {invoices.length} total
                      </div>
                    </div>
                  </div>
                  <DocTable documents={invoices} onPay={handlePay} type="invoice" />
                </>
              ) : (
                <>
                  <div className="portal-section-header">
                    <div className="portal-section-icon">📄</div>
                    <div>
                      <div className="portal-section-title">Bills to Receive</div>
                      <div className="portal-section-subtitle">
                        {bills.filter(b => b.status !== 'Paid').length} pending
                        {' '}· {bills.length} total
                      </div>
                    </div>
                  </div>
                  <DocTable documents={bills} onPay={handlePay} type="bill" />
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
