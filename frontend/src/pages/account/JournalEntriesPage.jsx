import { useState, useEffect } from 'react';
import ListView from '../../components/common/ListView';
import './JournalEntriesPage.css';

const JOURNAL_TYPE_ICON = {
  Sales: '🧾',
  Purchase: '📦',
  Bank: '🏦',
  Cash: '💵',
  General: '📓',
};

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View state: 'list' | 'form'
  const [viewMode, setViewMode] = useState('list');
  const [editingEntry, setEditingEntry] = useState(null);

  // Form state
  const [accountingDate, setAccountingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedJournalId, setSelectedJournalId] = useState('');
  const [lines, setLines] = useState([
    { id: '1', accountId: '', partnerId: '', debit: '', credit: '' },
    { id: '2', accountId: '', partnerId: '', debit: '', credit: '' },
  ]);
  const [entryStatus, setEntryStatus] = useState('Draft');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [jeRes, jRes, coaRes, cRes] = await Promise.all([
        fetch('/api/journal-entries', { headers }),
        fetch('/api/journals', { headers }),
        fetch('/api/chart-of-accounts', { headers }),
        fetch('/api/contacts', { headers }),
      ]);

      if (!jeRes.ok || !jRes.ok) throw new Error('Failed to load journal entries.');

      const jeData = await jeRes.json();
      const jData = await jRes.json();
      const coaData = coaRes.ok ? await coaRes.json() : [];
      const cData = cRes.ok ? await cRes.json() : [];

      setEntries(jeData);
      setJournals(jData);
      setAccounts(coaData.filter((a) => !a.archived));
      setContacts(cData);

      if (jData.length > 0 && !selectedJournalId) {
        setSelectedJournalId(jData[0].id);
      }
    } catch (err) {
      setError(err.message || 'Error fetching data.');
    } finally {
      setLoading(false);
    }
  };

  // Computed line totals
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  // Open Form View for New Entry
  const handleNew = () => {
    setEditingEntry(null);
    setAccountingDate(new Date().toISOString().split('T')[0]);
    setSelectedJournalId(journals[0]?.id || '');
    setEntryStatus('Draft');
    setLines([
      { id: '1', accountId: accounts[0]?.id || '', partnerId: '', debit: '', credit: '' },
      { id: '2', accountId: accounts[1]?.id || '', partnerId: '', debit: '', credit: '' },
    ]);
    setFormError('');
    setFormSuccess('');
    setViewMode('form');
  };

  // Open Form View for Existing Entry
  const handleRowClick = (entry) => {
    setEditingEntry(entry);
    setAccountingDate(entry.date || entry.accountingDate || new Date().toISOString().split('T')[0]);
    setSelectedJournalId(entry.journalId || (journals.find((j) => j.name === entry.journal)?.id) || '');
    setEntryStatus(entry.status || 'Draft');

    if (entry.lines && entry.lines.length > 0) {
      setLines(
        entry.lines.map((l, idx) => ({
          id: l.id || String(idx + 1),
          accountId: l.accountId || '',
          partnerId: l.partnerId || '',
          debit: l.debit ? String(l.debit) : '',
          credit: l.credit ? String(l.credit) : '',
        }))
      );
    } else {
      setLines([
        { id: '1', accountId: accounts[0]?.id || '', partnerId: '', debit: '', credit: '' },
        { id: '2', accountId: accounts[1]?.id || '', partnerId: '', debit: '', credit: '' },
      ]);
    }

    setFormError('');
    setFormSuccess('');
    setViewMode('form');
  };

  const handleBack = () => {
    setViewMode('list');
    setEditingEntry(null);
    setFormError('');
    setFormSuccess('');
  };

  // Line item helpers
  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        accountId: accounts[0]?.id || '',
        partnerId: '',
        debit: '',
        credit: '',
      },
    ]);
  };

  const handleRemoveLine = (index) => {
    if (lines.length <= 2) {
      setFormError('A journal entry requires at least 2 lines to maintain double-entry balance.');
      return;
    }
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === 'debit') {
        current.debit = value;
        if (value && parseFloat(value) > 0) {
          current.credit = ''; // A single line is either debit or credit
        }
      } else if (field === 'credit') {
        current.credit = value;
        if (value && parseFloat(value) > 0) {
          current.debit = ''; // A single line is either debit or credit
        }
      } else {
        current[field] = value;
      }

      updated[index] = current;
      return updated;
    });
    setFormError('');
  };

  // Submit Handler (targetStatus = 'Draft' | 'Posted')
  // Submit Handler (targetStatus = 'Draft' | 'Posted')
  const handleSave = async (targetStatus = 'Draft') => {
    setFormError('');
    setFormSuccess('');

    if (!selectedJournalId) {
      setFormError('Please select a journal.');
      return;
    }

    if (!accountingDate) {
      setFormError('Please select an accounting date.');
      return;
    }

    if (lines.length < 2) {
      setFormError('A journal entry requires at least 2 line items.');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].accountId) {
        setFormError(`Line ${i + 1}: Please select an account from the chart of accounts.`);
        return;
      }
      const deb = parseFloat(lines[i].debit) || 0;
      const cred = parseFloat(lines[i].credit) || 0;
      if (deb === 0 && cred === 0) {
        setFormError(`Line ${i + 1}: Enter either a debit or credit amount.`);
        return;
      }
    }

    // ─── MVP §4.5 Hard Blocking Rule on Post ──────────────────────────────────
    if (targetStatus === 'Posted') {
      if (Math.abs(totalDebit - totalCredit) > 0.001 || totalDebit <= 0) {
        setFormError(
          `Cannot post unbalanced entry. Total debit (₹${totalDebit.toFixed(2)}) must equal total credit (₹${totalCredit.toFixed(2)}).`
        );
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }
    }

    setFormSubmitting(true);
    try {
      const token = localStorage.getItem('uf_token');
      const isEdit = Boolean(editingEntry);
      const url = isEdit ? `/api/journal-entries/${editingEntry.id}` : '/api/journal-entries';
      const method = isEdit ? 'PUT' : 'POST';

      // Always create/save as Draft first — posting is a separate, explicit step
      // via the /post endpoint (same rule for both new and existing entries).
      const payload = {
        accountingDate,
        journalId: selectedJournalId,
        status: 'Draft',
        lines: lines.map((l) => ({
          accountId: l.accountId,
          partnerId: l.partnerId || null,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('CREATE RESPONSE:', data);
      if (!res.ok) throw new Error(data.error || 'Failed to save journal entry.');

      // If posting was requested, explicitly hit the /post endpoint —
      // this now runs for BOTH new entries and existing drafts.
      if (targetStatus === 'Posted' && data.status !== 'Posted') {
        const entryId = data.id || (isEdit ? editingEntry.id : null);
        if (!entryId) throw new Error('Missing entry id after save — cannot post.');

        const postRes = await fetch(`/api/journal-entries/${entryId}/post`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const postData = await postRes.json();
        if (!postRes.ok) throw new Error(postData.error || 'Failed to post journal entry.');
      }

      await fetchInitialData();
      setFormSuccess(
        targetStatus === 'Posted'
          ? `Journal entry ${data.number || ''} posted to general ledger.`
          : `Journal entry saved as draft.`
      );

      setTimeout(() => {
        setViewMode('list');
      }, 700);
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Cancel / Revert Handler
  const handleCancelEntry = async () => {
    if (!editingEntry) {
      handleBack();
      return;
    }

    if (editingEntry.status === 'Posted') {
      handleBack();
      return;
    }

    try {
      setFormSubmitting(true);
      const token = localStorage.getItem('uf_token');
      await fetch(`/api/journal-entries/${editingEntry.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchInitialData();
      handleBack();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // List View Columns
  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (je) => (
        <span className="je-date-cell">
          {je.date || je.accountingDate || '—'}
        </span>
      ),
    },
    {
      key: 'number',
      label: 'Number',
      render: (je) => (
        <span className="je-number-code">{je.number}</span>
      ),
    },
    {
      key: 'partner',
      label: 'Partner',
      render: (je) => (
        <span className="je-partner-cell">
          {je.partner && je.partner !== '—' ? je.partner : <span className="je-muted">—</span>}
        </span>
      ),
    },
    {
      key: 'journal',
      label: 'Journal',
      render: (je) => (
        <span className="je-journal-chip">
          <span className="je-journal-icon">{JOURNAL_TYPE_ICON[je.journal] || '📓'}</span>
          {je.journal || 'General'}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (je) => (
        <span className="je-total-cell">
          ₹{Number(je.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (je) => (
        <span
          className={`je-status-pill ${je.status === 'Posted' ? 'je-status-posted' : 'je-status-draft'
            }`}
        >
          {je.status === 'Posted' ? 'Posted' : 'Draft'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="je-loading-container">
        <div className="auth-loading-spinner"></div>
        <p>Loading journal entries...</p>
      </div>
    );
  }

  // ─── FORM VIEW ────────────────────────────────────────────────────────────
  if (viewMode === 'form') {
    const isPosted = entryStatus === 'Posted';
    const selectedJournal = journals.find((j) => j.id === selectedJournalId);

    return (
      <div className="je-form-page">
        {/* Document Action Header */}
        <div className="je-header-bar">
          <div className="je-title-group">
            <div className="je-breadcrumb">
              <span className="je-breadcrumb-link" onClick={handleBack}>
                Journal entries
              </span>
              <span className="je-breadcrumb-separator">/</span>
              <span className="je-breadcrumb-current">
                {editingEntry ? editingEntry.number : 'New entry'}
              </span>
            </div>
            <div className="je-title-row">
              <h1 className="je-heading">
                {editingEntry ? editingEntry.number : 'New journal entry'}
              </h1>
              <span
                className={`je-status-pill ${isPosted ? 'je-status-posted' : 'je-status-draft'
                  }`}
              >
                {isPosted ? 'Posted' : 'Draft'}
              </span>
            </div>
          </div>

          <div className="je-header-actions">
            <button
              type="button"
              id="je-back-btn"
              className="btn btn-outline"
              onClick={handleBack}
            >
              ← Back
            </button>

            {!isPosted ? (
              <>
                <button
                  type="button"
                  id="je-cancel-btn"
                  className="btn btn-outline je-btn-cancel"
                  onClick={handleCancelEntry}
                  disabled={formSubmitting}
                >
                  Discard
                </button>
                <button
                  type="button"
                  id="je-save-draft-btn"
                  className="btn btn-outline"
                  onClick={() => handleSave('Draft')}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : 'Save draft'}
                </button>
                <button
                  type="button"
                  id="je-post-btn"
                  className="btn btn-primary je-btn-post"
                  onClick={() => handleSave('Posted')}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Posting...' : 'Post journal entry'}
                </button>
              </>
            ) : (
              <div className="je-locked-tag">
                🔒 Posted record (read-only)
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        {formError && (
          <div className="je-banner je-banner-error" role="alert">
            <span className="je-banner-icon">⚠️</span>
            <span>{formError}</span>
          </div>
        )}
        {formSuccess && (
          <div className="je-banner je-banner-success" role="status">
            <span className="je-banner-icon">✅</span>
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Header Details Card */}
        <div className="je-card je-meta-card">
          <div className="je-meta-grid">
            <div className="je-form-group">
              <label htmlFor="je-accounting-date" className="je-label">
                Accounting date <span className="required">*</span>
              </label>
              <input
                id="je-accounting-date"
                type="date"
                value={accountingDate}
                disabled={isPosted}
                onChange={(e) => setAccountingDate(e.target.value)}
                className="je-input"
              />
            </div>

            <div className="je-form-group">
              <label htmlFor="je-journal-select" className="je-label">
                Journal <span className="required">*</span>
              </label>
              <select
                id="je-journal-select"
                value={selectedJournalId}
                disabled={isPosted}
                onChange={(e) => setSelectedJournalId(e.target.value)}
                className="je-select"
              >
                <option value="" disabled>
                  -- Select journal --
                </option>
                {journals.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="je-form-group">
              <label className="je-label">Entry number</label>
              <input
                type="text"
                value={editingEntry ? editingEntry.number : 'Auto-generated on post/save'}
                disabled
                className="je-input je-input-readonly"
              />
            </div>
          </div>
        </div>

        {/* Ledger Lines Card */}
        <div className="je-card je-lines-card">
          <div className="je-lines-header">
            <div>
              <h2 className="je-section-title">Journal items (ledger lines)</h2>
              <p className="je-section-subtitle">
                Each debit entry must have a corresponding credit entry to keep the ledger in balance.
              </p>
            </div>
            {!isPosted && (
              <button
                type="button"
                id="je-add-line-top-btn"
                className="btn btn-outline btn-sm"
                onClick={handleAddLine}
              >
                + Add line item
              </button>
            )}
          </div>

          <div className="je-table-wrapper">
            <table className="je-lines-table">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>
                    Account <span className="required">*</span>
                  </th>
                  <th style={{ width: '26%' }}>Partner</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Debit (₹)</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Credit (₹)</th>
                  {!isPosted && <th style={{ width: '8%', textAlign: 'center' }}></th>}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.id || idx} className="je-line-row">
                    <td>
                      <select
                        value={line.accountId}
                        disabled={isPosted}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        className="je-line-select"
                        id={`je-line-account-${idx}`}
                      >
                        <option value="" disabled>
                          -- Select account --
                        </option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        value={line.partnerId}
                        disabled={isPosted}
                        onChange={(e) => handleLineChange(idx, 'partnerId', e.target.value)}
                        className="je-line-select"
                        id={`je-line-partner-${idx}`}
                      >
                        <option value="">-- None --</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={line.debit}
                        disabled={isPosted}
                        onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                        className="je-line-input je-input-right"
                        id={`je-line-debit-${idx}`}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={line.credit}
                        disabled={isPosted}
                        onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                        className="je-line-input je-input-right"
                        id={`je-line-credit-${idx}`}
                      />
                    </td>

                    {!isPosted && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="je-line-remove-btn"
                          title="Remove line item"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 2}
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isPosted && (
            <div className="je-add-line-footer">
              <button
                type="button"
                id="je-add-line-btn"
                className="btn btn-outline btn-sm je-add-btn"
                onClick={handleAddLine}
              >
                + Add line item
              </button>
            </div>
          )}

          {/* Double-Entry Balance Strip ("Spend Boldness in One Place") */}
          <div className={`je-totals-bar ${isShaking ? 'shake-animation' : ''}`}>
            <div className="je-balance-indicator">
              {isBalanced ? (
                <div className="je-balance-status je-balance-ok">
                  <span className="balance-dot"></span>
                  <span className="balance-text">Balanced — Debits equal credits</span>
                </div>
              ) : (
                <div className="je-balance-status je-balance-warn">
                  <span className="balance-dot"></span>
                  <span className="balance-text">
                    Unbalanced — Difference: ₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="je-totals-grid">
              <div className="je-total-item">
                <span className="je-total-label">Total debit:</span>
                <span className="je-total-value">
                  ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="je-total-item">
                <span className="je-total-label">Total credit:</span>
                <span className="je-total-value">
                  ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="je-page-container">
      {error && <div className="je-banner je-banner-error">{error}</div>}

      <ListView
        title="Journal entries"
        subtitle="Double-entry ledger transactions and adjustments"
        data={entries}
        columns={columns}
        onNew={handleNew}
        onRowClick={handleRowClick}
        searchPlaceholder="Search entries by number, partner, or journal..."
      />
    </div>
  );
}
