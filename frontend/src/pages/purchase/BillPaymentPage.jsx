import { useState, useEffect } from 'react';
import ListView from '../../components/common/ListView';
import './BillPaymentPage.css';

export default function BillPaymentPage() {
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [currentPayment, setCurrentPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vendorBillId: '',
    partnerName: '',
    paymentType: 'SEND',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentVia: 'BANK',
    note: '',
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

      const [paymentsRes, billsRes] = await Promise.all([
        fetch('/api/bill-payments', { headers }),
        fetch('/api/vendor-bills', { headers }),
      ]);

      if (!paymentsRes.ok || !billsRes.ok) {
        throw new Error('Failed to load bill payments data.');
      }

      const [paymentsData, billsData] = await Promise.all([
        paymentsRes.json(),
        billsRes.json(),
      ]);

      setPayments(paymentsData);
      setBills(billsData.filter((b) => b.status === 'CONFIRMED' && Number(b.amountDue) > 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setCurrentPayment(null);
    setSuccessMessage('');
    setError('');

    const defaultBill = bills[0];
    setFormData({
      vendorBillId: defaultBill ? defaultBill.id : '',
      partnerName: defaultBill ? defaultBill.vendorName : '',
      paymentType: 'SEND',
      amount: defaultBill ? String(defaultBill.amountDue || '') : '',
      date: new Date().toISOString().split('T')[0],
      paymentVia: 'BANK',
      note: defaultBill ? `Payment for ${defaultBill.billNumber}` : '',
    });
    setViewMode('form');
  };

  const handleBillSelectChange = (billId) => {
    const selected = bills.find((b) => b.id === billId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        vendorBillId: selected.id,
        partnerName: selected.vendorName,
        amount: String(selected.amountDue || ''),
        note: `Payment for ${selected.billNumber}`,
      }));
    }
  };

  const handleRowClick = (payment) => {
    setCurrentPayment(payment);
    setSuccessMessage('');
    setError('');
    setFormData({
      vendorBillId: payment.vendorBillId,
      partnerName: payment.partnerName,
      paymentType: payment.paymentType || 'SEND',
      amount: String(payment.amount),
      date: payment.date,
      paymentVia: payment.paymentVia || 'BANK',
      note: payment.note || '',
    });
    setViewMode('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!formData.vendorBillId) {
      setError('Please select a Vendor Bill to pay.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      // Create payment
      const res = await fetch('/api/bill-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorBillId: formData.vendorBillId,
          amount: amt,
          date: formData.date,
          paymentVia: formData.paymentVia,
          note: formData.note,
        }),
      });

      const payment = await res.json();
      if (!res.ok) throw new Error(payment.error || 'Failed to create payment.');

      // Auto-confirm
      const confirmRes = await fetch(`/api/bill-payments/${payment.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || 'Failed to confirm payment.');

      alert(`Payment of $${amt.toFixed(2)} confirmed! Journal Entry #${confirmData.journalEntryNumber} generated.`);
      await fetchInitialData();
      setViewMode('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendMail = () => {
    alert(`Payment advice sent via email to ${formData.partnerName}.`);
  };

  // Columns for List View
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'billNumber', label: 'Bill No.' },
    {
      key: 'partnerName',
      label: 'Partner',
      render: (p) => <span className="partner-name-cell">{p.partnerName}</span>,
    },
    {
      key: 'paymentType',
      label: 'Type',
      render: (p) => (
        <span className="badge badge-type badge-goods">
          {p.paymentType === 'SEND' ? 'Send' : 'Receive'}
        </span>
      ),
    },
    {
      key: 'paymentVia',
      label: 'Payment Via',
      render: (p) => (
        <span className="font-medium">
          {p.paymentVia === 'CASH' ? 'Cash' : 'Bank'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      numeric: true,
      render: (p) => `$${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => (
        <span className={`badge badge-${p.status === 'CONFIRMED' ? 'confirmed' : 'draft'}`}>
          {p.status === 'CONFIRMED' ? 'Confirmed' : 'Draft'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="purchase-page-loading">
        <div className="auth-loading-spinner"></div>
        <p>Loading Payments...</p>
      </div>
    );
  }

  // --- FORM VIEW ---
  if (viewMode === 'form') {
    const isReadOnly = Boolean(currentPayment);

    return (
      <div className="purchase-form-container">
        {/* Document Header Bar */}
        <div className="form-header-bar">
          <div className="form-header-title">
            <div className="form-title-row">
              <h1>{currentPayment ? 'Bill Payment Receipt' : 'New Bill Payment'}</h1>
              {currentPayment && (
                <span className={`badge badge-${currentPayment.status === 'CONFIRMED' ? 'confirmed' : 'draft'}`}>
                  {currentPayment.status === 'CONFIRMED' ? 'Confirmed' : 'Draft'}
                </span>
              )}
            </div>
            <p className="form-subtitle">
              {currentPayment ? `Payment to ${currentPayment.partnerName}` : 'Record a disbursement to supplier'}
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

            {currentPayment && (
              <>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handlePrint}
                  title="Print Payment Receipt"
                >
                  🖨 Print
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleSendMail}
                  title="Send via Email"
                >
                  ✉ Send
                </button>
              </>
            )}

            {!isReadOnly && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Confirming...' : 'Confirm'}
              </button>
            )}
          </div>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        {/* Form Card */}
        <div className="po-document-card">
          <form onSubmit={handleSubmit} className="payment-form-grid">
            <div className="form-group">
              <label className="form-label">Payment Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="payType"
                    value="SEND"
                    checked={formData.paymentType === 'SEND'}
                    onChange={() => setFormData((prev) => ({ ...prev, paymentType: 'SEND' }))}
                    disabled={isReadOnly}
                  />
                  Send (Vendor Payment)
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="payType"
                    value="RECEIVE"
                    checked={formData.paymentType === 'RECEIVE'}
                    onChange={() => setFormData((prev) => ({ ...prev, paymentType: 'RECEIVE' }))}
                    disabled={isReadOnly}
                  />
                  Receive
                </label>
              </div>
            </div>

            {!isReadOnly && (
              <div className="form-group">
                <label className="form-label" htmlFor="pay-bill">
                  Select Bill to Pay <span className="required">*</span>
                </label>
                <select
                  id="pay-bill"
                  className="form-select"
                  value={formData.vendorBillId}
                  onChange={(e) => handleBillSelectChange(e.target.value)}
                >
                  {bills.length === 0 && <option value="">No pending bills to pay</option>}
                  {bills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.billNumber} — {b.vendorName} (Due: ${Number(b.amountDue).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="pay-partner">
                Partner
              </label>
              <input
                id="pay-partner"
                type="text"
                className="form-input"
                value={formData.partnerName}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pay-amount">
                Amount ($) <span className="required">*</span>
              </label>
              <input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pay-date">
                Date <span className="required">*</span>
              </label>
              <input
                id="pay-date"
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Via <span className="required">*</span></label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="formPaymentVia"
                    value="BANK"
                    checked={formData.paymentVia === 'BANK'}
                    onChange={() => setFormData((prev) => ({ ...prev, paymentVia: 'BANK' }))}
                    disabled={isReadOnly}
                  />
                  Bank
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="formPaymentVia"
                    value="CASH"
                    checked={formData.paymentVia === 'CASH'}
                    onChange={() => setFormData((prev) => ({ ...prev, paymentVia: 'CASH' }))}
                    disabled={isReadOnly}
                  />
                  Cash
                </label>
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="pay-note">
                Note
              </label>
              <input
                id="pay-note"
                type="text"
                className="form-input"
                placeholder="Alphanumeric memo (optional)"
                value={formData.note}
                onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- LIST VIEW (DEFAULT) ---
  return (
    <div className="purchase-page">
      <ListView
        title="Bill Payments"
        subtitle="Manage supplier disbursement receipts and payment journal entries"
        data={payments}
        columns={columns}
        viewMode={viewMode}
        onNew={handleNew}
        onRowClick={handleRowClick}
        searchPlaceholder="Search payments by bill, partner, or date..."
      />
    </div>
  );
}
