import { useState, useEffect } from 'react';
import ListView from '../../components/common/ListView';
import './JournalsPage.css';

const JOURNAL_TYPES = [
  { type: 'Sales', icon: '🧾', desc: 'Customer sales, invoices, and revenue records' },
  { type: 'Purchase', icon: '📦', desc: 'Vendor bills, supplier orders, and direct costs' },
  { type: 'Bank', icon: '🏦', desc: 'Wire transfers, account deposits, and bank transactions' },
  { type: 'Cash', icon: '💵', desc: 'Petty cash, direct till receipts, and cash payments' },
];

export default function JournalsPage() {
  const [journals, setJournals] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [editingJournal, setEditingJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Sales',
    defaultAccount: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [jRes, coaRes] = await Promise.all([
        fetch('/api/journals', { headers }),
        fetch('/api/chart-of-accounts', { headers }),
      ]);

      if (!jRes.ok || !coaRes.ok) throw new Error('Failed to load journals data.');

      const jData = await jRes.json();
      const coaData = await coaRes.json();

      setJournals(jData);
      setChartOfAccounts(coaData.filter((a) => !a.archived));
    } catch (err) {
      setError(err.message || 'Error loading data.');
    } finally {
      setLoading(false);
    }
  };

  // Open blank form for New journal
  const handleNew = () => {
    setEditingJournal(null);
    setFormData({ name: '', type: 'Sales', defaultAccount: '' });
    setFormError('');
    setFormSuccess('');
    setViewMode('form');
  };

  // Open existing journal in form view
  const handleRowClick = (journal) => {
    setEditingJournal(journal);
    setFormData({
      name: journal.name || '',
      type: journal.type || 'Sales',
      defaultAccount: journal.defaultAccount || '',
    });
    setFormError('');
    setFormSuccess('');
    setViewMode('form');
  };

  const handleBack = () => {
    setViewMode('list');
    setEditingJournal(null);
    setFormError('');
    setFormSuccess('');
  };

  // Handle form submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.name.trim()) {
      setFormError('Please enter a journal name.');
      return;
    }
    if (!formData.type) {
      setFormError('Please select a journal type.');
      return;
    }

    setFormSubmitting(true);
    try {
      const token = localStorage.getItem('uf_token');
      const isEdit = Boolean(editingJournal);
      const url = isEdit ? `/api/journals/${editingJournal.id}` : '/api/journals';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          defaultAccount: formData.defaultAccount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save journal.');

      await fetchData();
      setFormSuccess(isEdit ? 'Journal updated successfully.' : 'Journal created successfully.');
      setTimeout(() => {
        setViewMode('list');
      }, 700);
    } catch (err) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // List View columns per MVP §4.4
  const columns = [
    {
      key: 'name',
      label: 'Journal name',
      render: (j) => {
        const item = JOURNAL_TYPES.find((t) => t.type.toLowerCase() === (j.type || '').toLowerCase());
        return (
          <div className="journal-name-cell">
            <span className="journal-type-icon">{item?.icon || '📓'}</span>
            <span className="journal-cell-name">{j.name}</span>
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (j) => (
        <span className={`journal-type-tag journal-type-${(j.type || 'sales').toLowerCase()}`}>
          {j.type}
        </span>
      ),
    },
    {
      key: 'defaultAccount',
      label: 'Default account',
      render: (j) =>
        j.defaultAccount ? (
          <span className="journal-account-chip">{j.defaultAccount}</span>
        ) : (
          <span className="journal-no-account">—</span>
        ),
    },
  ];

  if (loading) {
    return (
      <div className="journals-page-loading">
        <div className="auth-loading-spinner"></div>
        <p>Loading journals...</p>
      </div>
    );
  }

  // ─── FORM VIEW ────────────────────────────────────────────────────────────
  if (viewMode === 'form') {
    const activeTypeObj = JOURNAL_TYPES.find((t) => t.type === formData.type) || JOURNAL_TYPES[0];

    return (
      <div className="journal-form-container">
        {/* Document Header Bar */}
        <div className="journal-form-header">
          <div className="journal-header-title-group">
            <div className="journal-breadcrumb">
              <span className="journal-breadcrumb-link" onClick={handleBack}>
                Journals
              </span>
              <span className="journal-breadcrumb-sep">/</span>
              <span className="journal-breadcrumb-current">
                {editingJournal ? editingJournal.name : 'New journal'}
              </span>
            </div>
            <h1 className="journal-page-heading">
              {editingJournal ? editingJournal.name : 'New journal'}
            </h1>
            <p className="journal-page-subheading">
              {editingJournal
                ? `Update configuration and default account for ${editingJournal.name}.`
                : 'Create a dedicated journal book to organize double-entry ledger transactions.'}
            </p>
          </div>

          <div className="journal-form-actions">
            <button
              type="button"
              id="journal-form-back"
              className="btn btn-outline"
              onClick={handleBack}
            >
              ← Back
            </button>
            <button
              type="button"
              id="journal-form-save"
              className="btn btn-primary"
              onClick={handleFormSubmit}
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Saving...' : editingJournal ? 'Save changes' : 'Create journal'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {formError && (
          <div className="journal-banner journal-banner-error" role="alert">
            <span className="journal-banner-icon">⚠️</span>
            <span>{formError}</span>
          </div>
        )}
        {formSuccess && (
          <div className="journal-banner journal-banner-success" role="status">
            <span className="journal-banner-icon">✅</span>
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="journal-form-card">
          {/* Type Selector Grid */}
          <div className="journal-type-section">
            <label className="journal-section-label">
              Journal type <span className="required">*</span>
            </label>
            <div className="journal-type-grid" role="radiogroup" aria-label="Journal Type">
              {JOURNAL_TYPES.map((t) => {
                const isSelected = formData.type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    id={`journal-type-${t.type.toLowerCase()}`}
                    role="radio"
                    aria-checked={isSelected}
                    className={`journal-type-card ${isSelected ? 'active' : ''}`}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, type: t.type }))
                    }
                  >
                    <div className="type-card-header">
                      <span className="type-card-icon">{t.icon}</span>
                      <span className="type-card-title">{t.type}</span>
                    </div>
                    <p className="type-card-desc">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Fields */}
          <form onSubmit={handleFormSubmit} className="journal-fields-layout">
            <div className="journal-field-group">
              <label className="journal-field-label" htmlFor="j-name">
                Journal name <span className="required">*</span>
              </label>
              <input
                id="j-name"
                type="text"
                className="journal-field-input"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Sales, Main Bank Account, Warehouse Cash"
                required
              />
              <p className="journal-field-hint">
                The public name displayed across invoices, bills, and payment receipts.
              </p>
            </div>

            <div className="journal-field-group">
              <label className="journal-field-label" htmlFor="j-default-account">
                Default account
              </label>
              <select
                id="j-default-account"
                className="journal-field-select"
                value={formData.defaultAccount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultAccount: e.target.value }))
                }
              >
                <option value="">— Select from chart of accounts —</option>
                {chartOfAccounts.map((coa) => (
                  <option key={coa.id} value={coa.name}>
                    {coa.name} ({coa.type})
                  </option>
                ))}
              </select>
              <p className="journal-field-hint">
                When posting transactions in this journal, new line items will automatically link to this account.
              </p>
            </div>
          </form>

          {/* Visual Summary Box */}
          <div className="journal-summary-box">
            <div className="summary-title">Summary preview</div>
            <div className="summary-row">
              <span className={`journal-type-tag journal-type-${formData.type.toLowerCase()}`}>
                {activeTypeObj.icon} {formData.type}
              </span>
              <span className="summary-name">{formData.name || 'Untitled journal'}</span>
              {formData.defaultAccount ? (
                <span className="journal-account-chip">
                  Account: {formData.defaultAccount}
                </span>
              ) : (
                <span className="summary-unassigned">No default account assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="journals-page-layout">
      {error && <div className="journal-banner journal-banner-error">{error}</div>}
      <ListView
        title="Journals"
        subtitle="Accounting registers categorized by Sales, Purchase, Bank, and Cash"
        data={journals}
        columns={columns}
        viewMode="list"
        onNew={handleNew}
        onRowClick={handleRowClick}
        searchPlaceholder="Search journals by name or type..."
      />
    </div>
  );
}
