import { useState, useEffect } from 'react';
import ListView from '../../components/common/ListView';
import KanbanView from '../../components/common/KanbanView';
import './ChartOfAccountsPage.css';

// ── Account type helpers ────────────────────────────────────────────────────

/** Returns 'bs-type' for Balance Sheet accounts, 'pl-type' for P&L accounts */
function getTypeClass(type) {
  const balanceSheet = ['Asset', 'Liability', 'Bank', 'Capital', 'Cash'];
  return balanceSheet.includes(type) ? 'bs-type' : 'pl-type';
}

const ACCOUNT_TYPES = {
  balanceSheet: ['Asset', 'Liability', 'Bank', 'Capital', 'Cash'],
  pnl: ['Income', 'Expenses', 'Other Expenses'],
};

const TYPE_METADATA = {
  Asset: {
    category: 'Balance Sheet',
    normalBalance: 'Debit (Dr)',
    report: 'Balance Sheet',
    description: 'Resources owned by the company that provide future economic value, such as bank accounts, receivables, and inventory.',
    icon: '🏛️',
  },
  Liability: {
    category: 'Balance Sheet',
    normalBalance: 'Credit (Cr)',
    report: 'Balance Sheet',
    description: 'Financial obligations and debts owed to external vendors, lenders, or suppliers.',
    icon: '📋',
  },
  Bank: {
    category: 'Balance Sheet',
    normalBalance: 'Debit (Dr)',
    report: 'Balance Sheet & Cash Flow',
    description: 'Checking, savings, or merchant deposit accounts used for banking transactions and reconciliation.',
    icon: '💳',
  },
  Capital: {
    category: 'Balance Sheet',
    normalBalance: 'Credit (Cr)',
    report: 'Balance Sheet (Equity)',
    description: "Owner's equity, retained earnings, partner shares, and contributed capital.",
    icon: '🪙',
  },
  Cash: {
    category: 'Balance Sheet',
    normalBalance: 'Debit (Dr)',
    report: 'Balance Sheet & Cash Flow',
    description: 'Liquid physical currency, petty cash registers, and physical point-of-sale drawers.',
    icon: '💵',
  },
  Income: {
    category: 'Profit & Loss',
    normalBalance: 'Credit (Cr)',
    report: 'Profit & Loss (P&L)',
    description: 'Revenue earned from sales of furniture, custom fabrication, and delivery services.',
    icon: '📈',
  },
  Expenses: {
    category: 'Profit & Loss',
    normalBalance: 'Debit (Dr)',
    report: 'Profit & Loss (P&L)',
    description: 'Direct and operating costs incurred to run the business (rent, utilities, payroll, materials).',
    icon: '📉',
  },
  'Other Expenses': {
    category: 'Profit & Loss',
    normalBalance: 'Debit (Dr)',
    report: 'Profit & Loss (P&L)',
    description: 'Non-operating expenditures, banking surcharges, interest, tax adjustments, or depreciation.',
    icon: '🧾',
  },
};

const DEFAULT_FORM = { name: '', type: 'Asset' };

// ── Component ───────────────────────────────────────────────────────────────

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban' | 'form'
  const [editingAccount, setEditingAccount] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [archiving, setArchiving] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAccounts = async (includeArchived = showArchived) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(
        `/api/chart-of-accounts?includeArchived=${includeArchived}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to load Chart of Accounts.');
      setAccounts(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(showArchived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNew = () => {
    setEditingAccount(null);
    setFormData(DEFAULT_FORM);
    setFormError('');
    setViewMode('form');
  };

  const handleRowClick = (account) => {
    setEditingAccount(account);
    setFormData({ name: account.name, type: account.type });
    setFormError('');
    setViewMode('form');
  };

  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Account Name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const token = localStorage.getItem('uf_token');
      const isEditing = Boolean(editingAccount);
      const url = isEditing
        ? `/api/chart-of-accounts/${editingAccount.id}`
        : '/api/chart-of-accounts';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: formData.name.trim(), type: formData.type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save account.');

      await fetchAccounts(showArchived);
      setViewMode('list');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!editingAccount) return;
    setArchiving(true);
    setFormError('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/chart-of-accounts/${editingAccount.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to archive account.');

      await fetchAccounts(showArchived);
      setViewMode('list');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setArchiving(false);
    }
  };

  // ── List View columns config ───────────────────────────────────────────────

  const columns = [
    {
      key: 'name',
      label: 'Account Name',
      render: (a) => (
        <>
          {a.name}
          {a.archived && <span className="coa-archived-pill">Archived</span>}
        </>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (a) => (
        <span className={`coa-type-badge ${getTypeClass(a.type)}`}>{a.type}</span>
      ),
    },
  ];

  // ── Extra header actions (Archived toggle) ────────────────────────────────

  const archivedToggleButton = (
    <button
      type="button"
      className={`btn-archived-toggle ${showArchived ? 'active' : ''}`}
      onClick={() => setShowArchived((prev) => !prev)}
      title={showArchived ? 'Hide archived accounts' : 'Show archived accounts'}
    >
      <span>📁</span>
      {showArchived ? 'Hide Archived' : 'Archived'}
    </button>
  );

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="coa-page-loading">
        <div className="auth-loading-spinner" />
        <p>Loading Chart of Accounts…</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="coa-page-loading">
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <p style={{ color: 'var(--accent-danger)' }}>{error}</p>
        <button type="button" className="btn btn-outline" onClick={() => fetchAccounts(showArchived)}>
          Retry
        </button>
      </div>
    );
  }

  // ── Form View ──────────────────────────────────────────────────────────────

  if (viewMode === 'form') {
    const isSystem = editingAccount?.system === true;
    const isArchived = editingAccount?.archived === true;
    const selectedMeta = TYPE_METADATA[formData.type] || TYPE_METADATA.Asset;
    const isBalanceSheet = selectedMeta.category === 'Balance Sheet';

    // Sibling accounts in the same type
    const siblingAccounts = accounts.filter(
      (a) => a.type === formData.type && (!editingAccount || a.id !== editingAccount.id)
    );

    return (
      <div className="coa-form-container">
        {/* Header bar */}
        <div className="coa-form-header-bar">
          <div className="coa-form-header-title">
            <div className="coa-form-title-row">
              <h1>{editingAccount ? 'Edit Account' : 'New Account'}</h1>
              {isArchived ? (
                <span className="coa-badge-archived">Archived</span>
              ) : isSystem ? (
                <span className="coa-badge-system">System Account</span>
              ) : editingAccount ? (
                <span className="coa-badge-active">Active</span>
              ) : null}
            </div>
            <p className="coa-form-subtitle">
              {editingAccount
                ? editingAccount.name
                : 'Define and classify a new ledger account'}
            </p>
          </div>
          <div className="coa-form-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setViewMode('list')}
            >
              ← Back to List
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleNew}
            >
              + New Account
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFormSubmit}
              disabled={formSubmitting || isArchived}
            >
              {formSubmitting ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>

        {/* 2-Column Form Body */}
        <div className="coa-form-layout">
          {/* Left Column: Form Fields & Actions */}
          <div className="coa-form-main-col">
            <div className={`coa-form-card ${isBalanceSheet ? 'accent-bs' : 'accent-pl'}`}>
              {formError && (
                <div className="alert alert-error coa-form-alert">
                  <span className="alert-icon">⚠️</span>
                  <div>{formError}</div>
                </div>
              )}

              <div className="coa-card-section-header">
                <h3>Account Information</h3>
                <p>Enter the identifier and core financial type for this account.</p>
              </div>

              <form onSubmit={handleFormSubmit} className="coa-form-fields">
                {/* Account Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="coa-name">
                    Account Name <span className="required-mark">*</span>
                  </label>
                  <input
                    id="coa-name"
                    type="text"
                    className="form-input coa-input-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Bank A/c, Showroom Rent, Delivery Revenue"
                    required
                    disabled={isArchived}
                    autoFocus={!editingAccount}
                  />
                  <span className="form-hint">
                    A clear, descriptive name as it will appear in reports and journal lines.
                  </span>
                </div>

                {/* Type — Grouped dropdown */}
                <div className="form-group">
                  <div className="coa-label-with-badge">
                    <label className="form-label" htmlFor="coa-type">
                      Account Type <span className="required-mark">*</span>
                    </label>
                    <span className={`coa-type-badge ${isBalanceSheet ? 'bs-type' : 'pl-type'}`}>
                      {selectedMeta.category}
                    </span>
                  </div>
                  <select
                    id="coa-type"
                    className="form-input form-select coa-type-select"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value }))
                    }
                    disabled={isArchived}
                  >
                    <optgroup label="Balance Sheet Accounts">
                      {ACCOUNT_TYPES.balanceSheet.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Profit & Loss Accounts">
                      {ACCOUNT_TYPES.pnl.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </optgroup>
                  </select>
                  <span className="form-hint">
                    Determines placement on the Balance Sheet or Income Statement.
                  </span>
                </div>
              </form>

              {/* Status / Danger Zone Section */}
              {editingAccount && (
                <div className="coa-status-zone">
                  {isArchived ? (
                    <div className="coa-notice-box coa-notice-archived">
                      <span className="coa-notice-icon">📁</span>
                      <div className="coa-notice-content">
                        <strong>Archived Account</strong>
                        <p>This account is archived and read-only. It remains preserved for historic journal entries.</p>
                      </div>
                    </div>
                  ) : isSystem ? (
                    <div className="coa-notice-box coa-notice-system">
                      <span className="coa-notice-icon">🔒</span>
                      <div className="coa-notice-content">
                        <strong>System Protected Account</strong>
                        <p>This account is essential to the core accounting ledger and cannot be archived or removed.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="coa-danger-box">
                      <div className="coa-danger-content">
                        <strong>Archive Account</strong>
                        <p>
                          Archiving removes this account from active lists and selection dropdowns. Existing journal records remain intact.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger-outline"
                        onClick={handleArchive}
                        disabled={archiving}
                      >
                        {archiving ? 'Archiving…' : 'Archive Account'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Ledger Classification & Context Inspector */}
          <div className="coa-form-side-col">
            {/* Classification Inspector Card */}
            <div className="coa-inspector-card">
              <div className="coa-inspector-header">
                <span className="coa-inspector-icon">{selectedMeta.icon}</span>
                <div>
                  <h4 className="coa-inspector-title">{formData.type || 'Asset'} Classification</h4>
                  <span className="coa-inspector-subtitle">{selectedMeta.category}</span>
                </div>
              </div>

              <div className="coa-inspector-body">
                <p className="coa-inspector-desc">{selectedMeta.description}</p>

                <div className="coa-inspector-specs">
                  <div className="coa-spec-row">
                    <span className="coa-spec-label">Financial Statement</span>
                    <span className="coa-spec-value">{selectedMeta.report}</span>
                  </div>
                  <div className="coa-spec-row">
                    <span className="coa-spec-label">Normal Balance</span>
                    <span className="coa-spec-value coa-spec-highlight">{selectedMeta.normalBalance}</span>
                  </div>
                  <div className="coa-spec-row">
                    <span className="coa-spec-label">Classification Group</span>
                    <span className="coa-spec-value">{selectedMeta.category}</span>
                  </div>
                </div>

                {/* Sibling Accounts Overview */}
                <div className="coa-siblings-section">
                  <div className="coa-siblings-header">
                    <span>Other {formData.type} Accounts</span>
                    <span className="coa-siblings-count">{siblingAccounts.length}</span>
                  </div>
                  {siblingAccounts.length === 0 ? (
                    <p className="coa-siblings-empty">No other {formData.type} accounts registered.</p>
                  ) : (
                    <ul className="coa-siblings-list">
                      {siblingAccounts.slice(0, 5).map((acc) => (
                        <li key={acc.id} className="coa-sibling-item">
                          <span className="coa-sibling-name">{acc.name}</span>
                          {acc.system && <span className="coa-sibling-tag">system</span>}
                          {acc.archived && <span className="coa-sibling-tag archived">archived</span>}
                        </li>
                      ))}
                      {siblingAccounts.length > 5 && (
                        <li className="coa-sibling-more">+{siblingAccounts.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Kanban View ────────────────────────────────────────────────────────────

  if (viewMode === 'kanban') {
    return (
      <div className="coa-page">
        <KanbanView
          title="Chart of Accounts"
          subtitle="Account register for ledger classification and reporting"
          data={accounts}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onNew={handleNew}
          onCardClick={handleRowClick}
          searchPlaceholder="Search accounts by name or type…"
          extraHeaderActions={archivedToggleButton}
          renderCard={(a) => (
            <>
              <span className="coa-kanban-name">{a.name}</span>
              <span className={`coa-type-badge ${getTypeClass(a.type)}`}>
                {a.type}
              </span>
            </>
          )}
        />
      </div>
    );
  }

  // ── List View (default) ────────────────────────────────────────────────────

  return (
    <div className="coa-page">
      <ListView
        title="Chart of Accounts"
        subtitle="Account register for ledger classification and reporting"
        data={accounts}
        columns={columns}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onNew={handleNew}
        onRowClick={handleRowClick}
        searchPlaceholder="Search accounts by name or type…"
        extraHeaderActions={archivedToggleButton}
      />
    </div>
  );
}
