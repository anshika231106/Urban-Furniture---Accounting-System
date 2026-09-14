import { useState, useEffect } from 'react';
import ListView from '../../components/common/ListView';
import './JournalsPage.css';

const JOURNAL_TYPES = ['Sales', 'Purchase', 'Bank', 'Cash'];

const TYPE_BADGE_CLASS = {
  Sales: 'badge-type-sales',
  Purchase: 'badge-type-purchase',
  Bank: 'badge-type-bank',
  Cash: 'badge-type-cash',
};

const TYPE_ICON = {
  Sales: '🧾',
  Purchase: '📦',
  Bank: '🏦',
  Cash: '💵',
};

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

      if (!jRes.ok || !coaRes.ok) throw new Error('Failed to load journal data.');

      const jData = await jRes.json();
      const coaData = await coaRes.json();

      setJournals(jData);
      setChartOfAccounts(coaData);
    } catch (err) {
      setError(err.message);
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
      setFormError('Journal Name is required.');
      return;
    }
    if (!formData.type) {
      setFormError('Journal Type is required.');
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
      // Brief success flash then go back to list
      setTimeout(() => {
        setViewMode('list');
      }, 800);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // List View columns as per MVP §4.4
  const columns = [
    {
      key: 'name',
      label: 'Journal Name',
      render: (j) => (
        <div className="journal-name-cell">
          <span className="journal-type-icon">{TYPE_ICON[j.type] || '📓'}</span>
          <span className="journal-cell-name">{j.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (j) => (
        <span className={`badge journal-type-badge ${TYPE_BADGE_CLASS[j.type] || ''}`}>
          {j.type}
        </span>
      ),
    },
    {
      key: 'defaultAccount',
      label: 'Default Account',
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
        <p>Loading Journals...</p>
      </div>
    );
  }

  // ─── FORM VIEW ────────────────────────────────────────────────────────────
  if (viewMode === 'form') {
    return (
      <div className="journal-form-container">
        {/* Document Header Bar */}
        <div className="form-header-bar">
          <div className="form-header-title">
            <h1>{editingJournal ? 'Edit Journal' : 'New Journal'}</h1>
            <p className="form-subtitle">
              {editingJournal
                ? `Editing "${editingJournal.name}"`
                : 'Configure a new accounting journal'}
            </p>
          </div>
          <div className="form-header-actions">
            <button
              type="button"
              id="journal-form-back"
              className="btn btn-outline"
              onClick={handleBack}
            >
              ← Back
            </button>
            {!editingJournal && (
              <button
                type="button"
                id="journal-form-new"
                className="btn btn-outline"
                onClick={handleNew}
              >
                + New
              </button>
            )}
            <button
              type="button"
              id="journal-form-confirm"
              className="btn btn-primary"
              onClick={handleFormSubmit}
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="journal-form-card">
          {formError && <div className="form-error-banner">{formError}</div>}
          {formSuccess && <div className="form-success-banner">{formSuccess}</div>}

          {/* Type selector tabs */}
          <div className="journal-type-selector">
            <p className="journal-type-label">
              Journal Type <span className="required">*</span>
            </p>
            <div className="journal-type-tabs" role="radiogroup" aria-label="Journal Type">
              {JOURNAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  id={`journal-type-${t.toLowerCase()}`}
                  role="radio"
                  aria-checked={formData.type === t}
                  className={`journal-type-tab ${formData.type === t ? 'active' : ''}`}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, type: t, defaultAccount: '' }))
                  }
                >
                  <span className="tab-icon">{TYPE_ICON[t]}</span>
                  <span className="tab-label">{t}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="journal-form-fields">
            {/* Journal Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="j-name">
                Journal Name <span className="required">*</span>
              </label>
              <input
                id="j-name"
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Sales, Bank, Petty Cash"
                required
              />
              <p className="form-hint">
                A short, descriptive name for this journal (e.g. "Sales", "Bank").
              </p>
            </div>

            {/* Default Account — Many-to-one from Chart of Accounts */}
            <div className="form-group">
              <label className="form-label" htmlFor="j-default-account">
                Default Account
              </label>
              <select
                id="j-default-account"
                className="form-select"
                value={formData.defaultAccount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultAccount: e.target.value }))
                }
              >
                <option value="">— None —</option>
                {chartOfAccounts.map((coa) => (
                  <option key={coa.id} value={coa.name}>
                    {coa.name} ({coa.type})
                  </option>
                ))}
              </select>
              <p className="form-hint">
                Linked to Chart of Accounts — the account this journal defaults to when posting entries.
              </p>
            </div>
          </form>

          {/* Preview strip */}
          <div className="journal-preview-strip">
            <div className="preview-label">Preview</div>
            <div className="preview-row">
              <span className={`badge journal-type-badge ${TYPE_BADGE_CLASS[formData.type] || ''}`}>
                {formData.type}
              </span>
              <span className="preview-name">{formData.name || 'Journal Name'}</span>
              {formData.defaultAccount && (
                <>
                  <span className="preview-arrow">→</span>
                  <span className="journal-account-chip">{formData.defaultAccount}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW (DEFAULT) ───────────────────────────────────────────────────
  return (
    <div className="journals-page">
      {error && <div className="form-error-banner journals-error">{error}</div>}
      <ListView
        title="Journals"
        subtitle="Manage accounting journals — Sales, Purchase, Bank, and Cash"
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
