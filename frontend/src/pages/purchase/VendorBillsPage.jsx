import { useState, useEffect } from 'react';
import ListView from '../../components/common/ListView';
import './VendorBillsPage.css';

export default function VendorBillsPage() {
  const [bills, setBills] = useState([]);
  const [options, setOptions] = useState({ vendors: [], products: [], accounts: [], analytics: [], defaultPurchaseAccountId: '' });
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [currentBill, setCurrentBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pay Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentVia: 'BANK',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  // Form State
  const [formData, setFormData] = useState({
    billNumber: '',
    reference: '',
    vendorId: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lines: [
      { id: 'l-1', productId: '', accountId: '', analyticAccountId: '', qty: 1, unitPrice: 0, total: 0 }
    ],
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [billsRes, optionsRes] = await Promise.all([
        fetch('/api/vendor-bills', { headers }),
        fetch('/api/purchase/options', { headers }),
      ]);

      if (!billsRes.ok || !optionsRes.ok) {
        throw new Error('Failed to load vendor bills.');
      }

      const [billsData, optionsData] = await Promise.all([
        billsRes.json(),
        optionsRes.json(),
      ]);

      setBills(billsData);
      setOptions(optionsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setCurrentBill(null);
    setWarningMessage('');
    setSuccessMessage('');
    setFormData({
      billNumber: 'Auto-generated',
      reference: '',
      vendorId: options.vendors.length > 0 ? options.vendors[0].id : '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lines: [
        {
          id: `line-${Date.now()}`,
          productId: options.products.length > 0 ? options.products[0].id : '',
          accountId: options.defaultPurchaseAccountId || (options.accounts[0]?.id || ''),
          analyticAccountId: '',
          qty: 1,
          unitPrice: options.products.length > 0 ? Number(options.products[0].cost || 0) : 0,
          total: options.products.length > 0 ? Number(options.products[0].cost || 0) : 0,
        },
      ],
    });
    setViewMode('form');
  };

  const handleRowClick = async (bill) => {
    setWarningMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/vendor-bills/${bill.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load bill details.');
      const data = await res.json();

      setCurrentBill(data);
      setFormData({
        billNumber: data.billNumber,
        reference: data.reference || '',
        vendorId: data.vendorId,
        billDate: data.billDate,
        dueDate: data.dueDate,
        lines: data.lines.length > 0 ? data.lines : [
          {
            id: `line-${Date.now()}`,
            productId: '',
            accountId: options.defaultPurchaseAccountId || '',
            analyticAccountId: '',
            qty: 1,
            unitPrice: 0,
            total: 0
          }
        ],
      });
      setViewMode('form');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleProductChange = (index, productId) => {
    const prod = options.products.find((p) => p.id === productId);
    const unitPrice = prod ? Number(prod.cost || 0) : 0;

    setFormData((prev) => {
      const newLines = [...prev.lines];
      const qty = newLines[index].qty || 1;
      newLines[index] = {
        ...newLines[index],
        productId,
        unitPrice,
        total: Number((qty * unitPrice).toFixed(2)),
      };
      return { ...prev, lines: newLines };
    });
  };

  const handleAccountChange = (index, accountId) => {
    setFormData((prev) => {
      const newLines = [...prev.lines];
      newLines[index] = {
        ...newLines[index],
        accountId,
      };
      return { ...prev, lines: newLines };
    });
  };

  const handleAnalyticChange = (index, analyticAccountId) => {
    setFormData((prev) => {
      const newLines = [...prev.lines];
      newLines[index] = {
        ...newLines[index],
        analyticAccountId,
      };
      return { ...prev, lines: newLines };
    });
  };

  const handleQtyChange = (index, rawQty) => {
    const qty = Math.max(1, Number(rawQty) || 1);
    setFormData((prev) => {
      const newLines = [...prev.lines];
      const unitPrice = Number(newLines[index].unitPrice || 0);
      newLines[index] = {
        ...newLines[index],
        qty,
        total: Number((qty * unitPrice).toFixed(2)),
      };
      return { ...prev, lines: newLines };
    });
  };

  const handlePriceChange = (index, rawPrice) => {
    const unitPrice = Math.max(0, Number(rawPrice) || 0);
    setFormData((prev) => {
      const newLines = [...prev.lines];
      const qty = Number(newLines[index].qty || 1);
      newLines[index] = {
        ...newLines[index],
        unitPrice,
        total: Number((qty * unitPrice).toFixed(2)),
      };
      return { ...prev, lines: newLines };
    });
  };

  const handleAddLine = () => {
    const defaultProduct = options.products[0];
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          id: `line-${Date.now()}`,
          productId: defaultProduct ? defaultProduct.id : '',
          accountId: options.defaultPurchaseAccountId || (options.accounts[0]?.id || ''),
          analyticAccountId: '',
          qty: 1,
          unitPrice: defaultProduct ? Number(defaultProduct.cost || 0) : 0,
          total: defaultProduct ? Number(defaultProduct.cost || 0) : 0,
        },
      ],
    }));
  };

  const handleRemoveLine = (index) => {
    if (formData.lines.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const computeGrandTotal = () => {
    return formData.lines.reduce((sum, l) => sum + (Number(l.total) || 0), 0);
  };

  const handleSaveDraft = async (e) => {
    if (e) e.preventDefault();
    if (!formData.vendorId) {
      setError('Please select a Vendor.');
      return;
    }
    if (formData.lines.some((l) => !l.accountId)) {
      setError('Each line must have a Chart of Account selected.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const url = currentBill
        ? `/api/vendor-bills/${currentBill.id}`
        : '/api/vendor-bills';
      const method = currentBill ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorId: formData.vendorId,
          reference: formData.reference,
          billDate: formData.billDate,
          dueDate: formData.dueDate,
          lines: formData.lines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save vendor bill.');

      await fetchInitialData();
      setViewMode('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBill = async () => {
    if (!currentBill) return;
    setSubmitting(true);
    setError('');
    setWarningMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/vendor-bills/${currentBill.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm bill.');

      if (data.warning) {
        setWarningMessage(data.warning);
      }
      setSuccessMessage(`Vendor Bill confirmed! Journal Entry #${data.journalEntryNumber} posted.`);

      await fetchInitialData();
      // Reload current bill details
      const detailRes = await fetch(`/api/vendor-bills/${currentBill.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setCurrentBill(detailData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBill = async () => {
    if (!currentBill) return;
    if (!window.confirm('Are you sure you want to cancel this Vendor Bill?')) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/vendor-bills/${currentBill.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel bill.');

      await fetchInitialData();
      setViewMode('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = () => {
    if (!currentBill) return;
    setPaymentForm({
      amount: String(currentBill.amountDue || 0),
      paymentVia: 'BANK',
      date: new Date().toISOString().split('T')[0],
      note: `Payment for ${currentBill.billNumber}`,
    });
    setIsPayModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!currentBill) return;

    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch('/api/bill-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorBillId: currentBill.id,
          amount: amt,
          date: paymentForm.date,
          paymentVia: paymentForm.paymentVia,
          note: paymentForm.note,
        }),
      });

      const payment = await res.json();
      if (!res.ok) throw new Error(payment.error || 'Failed to register payment.');

      // Auto-confirm payment to post Journal Entry
      const confirmRes = await fetch(`/api/bill-payments/${payment.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || 'Failed to post payment.');

      setIsPayModalOpen(false);
      setSuccessMessage(`Payment of $${amt.toFixed(2)} posted! Journal Entry #${confirmData.journalEntryNumber} generated.`);

      await fetchInitialData();
      // Reload current bill
      const detailRes = await fetch(`/api/vendor-bills/${currentBill.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setCurrentBill(detailData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // List View Columns
  const columns = [
    {
      key: 'billNumber',
      label: 'Vendor Bill No.',
      render: (b) => <span className="bill-number-cell">{b.billNumber}</span>,
    },
    { key: 'reference', label: 'Bill Reference' },
    {
      key: 'vendorName',
      label: 'Vendor Name',
      render: (b) => <span className="vendor-name-cell">{b.vendorName}</span>,
    },
    { key: 'billDate', label: 'Bill Date' },
    { key: 'dueDate', label: 'Due Date' },
    {
      key: 'total',
      label: 'Total',
      numeric: true,
      render: (b) => `$${Number(b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'amountDue',
      label: 'Amount Due',
      numeric: true,
      render: (b) => (
        <span className={Number(b.amountDue) > 0 ? 'text-due-positive' : 'text-due-zero'}>
          ${Number(b.amountDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (b) => {
        const s = b.paymentStatus || 'NOT_PAID';
        const label = s === 'PAID' ? 'Paid' : s === 'PARTIAL' ? 'Partial' : 'Not Paid';
        const cssClass = s === 'PAID' ? 'badge-paid' : s === 'PARTIAL' ? 'badge-partial' : 'badge-unpaid';
        return <span className={`badge ${cssClass}`}>{label}</span>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="purchase-page-loading">
        <div className="auth-loading-spinner"></div>
        <p>Loading Vendor Bills...</p>
      </div>
    );
  }

  // --- FORM VIEW ---
  if (viewMode === 'form') {
    const isReadOnly = currentBill && currentBill.status !== 'DRAFT';
    const isDraft = !currentBill || currentBill.status === 'DRAFT';
    const isConfirmed = currentBill && currentBill.status === 'CONFIRMED';
    const canPay = isConfirmed && Number(currentBill.amountDue || 0) > 0;

    const paidViaCash = currentBill ? Number(currentBill.paidViaCash || 0) : 0;
    const paidViaBank = currentBill ? Number(currentBill.paidViaBank || 0) : 0;
    const grandTotal = currentBill ? Number(currentBill.total || 0) : computeGrandTotal();
    const amountDue = currentBill ? Number(currentBill.amountDue || 0) : grandTotal;

    return (
      <div className="purchase-form-container">
        {/* Document Header Bar */}
        <div className="form-header-bar">
          <div className="form-header-title">
            <div className="form-title-row">
              <h1>{formData.billNumber || 'New Vendor Bill'}</h1>
              {currentBill && (
                <span className={`badge badge-doc-${currentBill.status.toLowerCase()}`}>
                  {currentBill.status === 'CONFIRMED' ? 'Confirmed' : currentBill.status === 'CANCELLED' ? 'Cancelled' : 'Draft'}
                </span>
              )}
              {currentBill && (
                <span className={`badge ${currentBill.paymentStatus === 'PAID' ? 'badge-paid' : currentBill.paymentStatus === 'PARTIAL' ? 'badge-partial' : 'badge-unpaid'}`}>
                  {currentBill.paymentStatus === 'PAID' ? 'Paid' : currentBill.paymentStatus === 'PARTIAL' ? 'Partial' : 'Not Paid'}
                </span>
              )}
            </div>
            <p className="form-subtitle">
              {currentBill ? `Bill from ${currentBill.vendorName}` : 'Record a new supplier/vendor bill'}
            </p>
          </div>

          <div className="form-header-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setViewMode('list')}
            >
              ← Back
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleNew}
            >
              + New
            </button>

            {isDraft && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSaveDraft}
                disabled={submitting}
              >
                Save Draft
              </button>
            )}

            {isDraft && currentBill && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmBill}
                disabled={submitting}
              >
                Confirm
              </button>
            )}

            {canPay && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openPayModal}
                disabled={submitting}
              >
                💳 Pay
              </button>
            )}

            {currentBill && currentBill.poNumber && (
              <span className="badge badge-info" title="Originated from PO">
                🔗 PO: {currentBill.poNumber}
              </span>
            )}

            {currentBill && currentBill.status !== 'CANCELLED' && (
              <button
                type="button"
                className="btn btn-outline text-danger"
                onClick={handleCancelBill}
                disabled={submitting}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="form-success-banner">
            <span>✓</span> {successMessage}
          </div>
        )}

        {warningMessage && (
          <div className="budget-warning-banner">
            <span className="warning-icon">⚠</span>
            <div className="warning-text">
              <strong>Budget Warning</strong>
              <p>{warningMessage}</p>
            </div>
          </div>
        )}

        {error && <div className="form-error-banner">{error}</div>}

        {/* Document Card */}
        <div className="po-document-card">
          <div className="po-doc-header-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="bill-no">
                Vendor Bill No.
              </label>
              <input
                id="bill-no"
                type="text"
                className="form-input"
                value={formData.billNumber}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bill-ref">
                Bill Reference
              </label>
              <input
                id="bill-ref"
                type="text"
                className="form-input"
                placeholder="e.g. INV-2026-99"
                value={formData.reference}
                onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bill-vendor">
                Vendor Name <span className="required">*</span>
              </label>
              <select
                id="bill-vendor"
                className="form-select"
                value={formData.vendorId}
                onChange={(e) => setFormData((prev) => ({ ...prev, vendorId: e.target.value }))}
                disabled={isReadOnly}
              >
                {options.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bill-date">
                Bill Date <span className="required">*</span>
              </label>
              <input
                id="bill-date"
                type="date"
                className="form-input"
                value={formData.billDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, billDate: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="due-date">
                Due Date
              </label>
              <input
                id="due-date"
                type="date"
                className="form-input"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="po-lines-section">
            <div className="lines-section-header">
              <h3>Bill Lines</h3>
              {!isReadOnly && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleAddLine}
                >
                  + Add Line
                </button>
              )}
            </div>

            <div className="po-table-wrapper">
              <table className="po-lines-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Product</th>
                    <th style={{ width: '25%' }}>Chart of Account <span className="required">*</span></th>
                    <th style={{ width: '20%' }}>Budget Analytics</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Qty</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Unit Price ($)</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Total ($)</th>
                    {!isReadOnly && <th style={{ width: '3%' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, idx) => (
                    <tr key={line.id || idx}>
                      <td>
                        <select
                          className="form-select line-select"
                          value={line.productId || ''}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          disabled={isReadOnly}
                        >
                          <option value="">(None / General Expense)</option>
                          {options.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select line-select"
                          value={line.accountId || ''}
                          onChange={(e) => handleAccountChange(idx, e.target.value)}
                          disabled={isReadOnly}
                        >
                          {options.accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.type})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select line-select"
                          value={line.analyticAccountId || ''}
                          onChange={(e) => handleAnalyticChange(idx, e.target.value)}
                          disabled={isReadOnly}
                        >
                          <option value="">None</option>
                          {options.analytics.map((an) => (
                            <option key={an.id} value={an.id}>
                              {an.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-input line-input text-right"
                          value={line.qty}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          disabled={isReadOnly}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input line-input text-right"
                          value={line.unitPrice}
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          disabled={isReadOnly}
                        />
                      </td>
                      <td className="text-right line-total-cell">
                        ${Number(line.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      {!isReadOnly && (
                        <td>
                          {formData.lines.length > 1 && (
                            <button
                              type="button"
                              className="btn-line-delete"
                              onClick={() => handleRemoveLine(idx)}
                              title="Delete line"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Document Footer Summary (Exact layout per MVP.md §6.2) */}
            <div className="po-doc-footer">
              <div className="po-doc-footer-spacer"></div>
              <div className="po-totals-card">
                <div className="totals-row">
                  <span className="totals-label">Total:</span>
                  <span className="totals-val font-semibold">
                    ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="totals-row">
                  <span className="totals-label">Paid Via Cash:</span>
                  <span className="totals-val text-muted">
                    ${paidViaCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="totals-row">
                  <span className="totals-label">Paid Via Bank:</span>
                  <span className="totals-val text-muted">
                    ${paidViaBank.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="totals-row grand-total-row">
                  <span className="totals-label">Amount Due:</span>
                  <span className="totals-amount">
                    ${amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History Section (if any payments exist) */}
        {currentBill && currentBill.payments && currentBill.payments.length > 0 && (
          <div className="bill-payments-history-card">
            <h3>Payment Transactions</h3>
            <table className="payments-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payment Via</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {currentBill.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td>{p.paymentVia === 'CASH' ? 'Cash' : 'Bank'}</td>
                    <td>
                      <span className={`badge badge-${p.status === 'CONFIRMED' ? 'confirmed' : 'draft'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.note || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ${Number(p.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pay Modal Dialog */}
        {isPayModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsPayModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Register Bill Payment</h2>
                <button type="button" className="modal-close" onClick={() => setIsPayModalOpen(false)}>
                  ×
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Vendor</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentBill?.vendorName || ''}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Amount ($) <span className="required">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={currentBill?.amountDue || undefined}
                      className="form-input"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                    <small className="form-hint">Remaining due: ${Number(currentBill?.amountDue || 0).toFixed(2)}</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Date <span className="required">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Via <span className="required">*</span></label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="paymentVia"
                          value="BANK"
                          checked={paymentForm.paymentVia === 'BANK'}
                          onChange={() => setPaymentForm((prev) => ({ ...prev, paymentVia: 'BANK' }))}
                        />
                        Bank
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="paymentVia"
                          value="CASH"
                          checked={paymentForm.paymentVia === 'CASH'}
                          onChange={() => setPaymentForm((prev) => ({ ...prev, paymentVia: 'CASH' }))}
                        />
                        Cash
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Note</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Optional memo or transaction reference"
                      value={paymentForm.note}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsPayModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Confirming...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- LIST VIEW (DEFAULT) ---
  return (
    <div className="purchase-page">
      <ListView
        title="Vendor Bills"
        subtitle="Manage supplier bills, payments, and automated journal entries"
        data={bills}
        columns={columns}
        viewMode={viewMode}
        onNew={handleNew}
        onRowClick={handleRowClick}
        searchPlaceholder="Search bills by number, reference, or vendor..."
      />
    </div>
  );
}
