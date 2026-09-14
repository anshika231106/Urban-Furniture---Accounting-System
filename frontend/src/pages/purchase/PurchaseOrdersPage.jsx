import { useState, useEffect } from 'react';
import ListView from '../../components/common/ListView';
import './PurchaseOrdersPage.css';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [options, setOptions] = useState({ vendors: [], products: [], accounts: [], analytics: [] });
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'form'
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    poNumber: '',
    vendorId: '',
    poDate: new Date().toISOString().split('T')[0],
    lines: [
      { id: 'l-1', productId: '', analyticAccountId: '', qty: 1, unitPrice: 0, total: 0 }
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

      const [ordersRes, optionsRes] = await Promise.all([
        fetch('/api/purchase-orders', { headers }),
        fetch('/api/purchase/options', { headers }),
      ]);

      if (!ordersRes.ok || !optionsRes.ok) {
        throw new Error('Failed to load purchase orders.');
      }

      const [ordersData, optionsData] = await Promise.all([
        ordersRes.json(),
        optionsRes.json(),
      ]);

      setOrders(ordersData);
      setOptions(optionsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setCurrentOrder(null);
    setWarningMessage('');
    setFormData({
      poNumber: 'Auto-generated',
      vendorId: options.vendors.length > 0 ? options.vendors[0].id : '',
      poDate: new Date().toISOString().split('T')[0],
      lines: [
        {
          id: `line-${Date.now()}`,
          productId: options.products.length > 0 ? options.products[0].id : '',
          analyticAccountId: '',
          qty: 1,
          unitPrice: options.products.length > 0 ? Number(options.products[0].cost || 0) : 0,
          total: options.products.length > 0 ? Number(options.products[0].cost || 0) : 0,
        },
      ],
    });
    setViewMode('form');
  };

  const handleRowClick = async (order) => {
    setWarningMessage('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/purchase-orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load order details.');
      const data = await res.json();

      setCurrentOrder(data);
      setFormData({
        poNumber: data.poNumber,
        vendorId: data.vendorId,
        poDate: data.poDate,
        lines: data.lines.length > 0 ? data.lines : [
          { id: `line-${Date.now()}`, productId: '', analyticAccountId: '', qty: 1, unitPrice: 0, total: 0 }
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

  const handleAddLine = () => {
    const defaultProduct = options.products[0];
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          id: `line-${Date.now()}`,
          productId: defaultProduct ? defaultProduct.id : '',
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
    if (formData.lines.some((l) => !l.productId)) {
      setError('Please select a product for each line item.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const url = currentOrder
        ? `/api/purchase-orders/${currentOrder.id}`
        : '/api/purchase-orders';
      const method = currentOrder ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorId: formData.vendorId,
          poDate: formData.poDate,
          lines: formData.lines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save purchase order.');

      await fetchInitialData();
      setViewMode('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!currentOrder) return;
    setSubmitting(true);
    setError('');
    setWarningMessage('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/purchase-orders/${currentOrder.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm order.');

      if (data.warning) {
        setWarningMessage(data.warning);
      }

      await fetchInitialData();
      // Reload current order details
      const detailRes = await fetch(`/api/purchase-orders/${currentOrder.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setCurrentOrder(detailData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrder) return;
    if (!window.confirm('Are you sure you want to cancel this Purchase Order?')) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/purchase-orders/${currentOrder.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order.');

      await fetchInitialData();
      setViewMode('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBill = async () => {
    if (!currentOrder) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch(`/api/purchase-orders/${currentOrder.id}/create-bill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bill from PO.');

      alert(`Vendor Bill created successfully: ${data.billNumber}`);
      await fetchInitialData();
      setViewMode('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Table Columns config for ListView
  const columns = [
    {
      key: 'poNumber',
      label: 'PO No.',
      render: (po) => <span className="po-number-cell">{po.poNumber}</span>,
    },
    {
      key: 'vendorName',
      label: 'Vendor Name',
      render: (po) => <span className="vendor-name-cell">{po.vendorName}</span>,
    },
    { key: 'poDate', label: 'PO Date' },
    {
      key: 'total',
      label: 'Total',
      numeric: true,
      render: (po) => `$${Number(po.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (po) => (
        <span className={`badge badge-doc-${po.status.toLowerCase()}`}>
          {po.status === 'CONFIRMED' ? 'Confirmed' : po.status === 'CANCELLED' ? 'Cancelled' : 'Draft'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="purchase-page-loading">
        <div className="auth-loading-spinner"></div>
        <p>Loading Purchase Orders...</p>
      </div>
    );
  }

  // --- FORM VIEW ---
  if (viewMode === 'form') {
    const isReadOnly = currentOrder && currentOrder.status !== 'DRAFT';
    const isDraft = !currentOrder || currentOrder.status === 'DRAFT';
    const isConfirmed = currentOrder && currentOrder.status === 'CONFIRMED';

    return (
      <div className="purchase-form-container">
        {/* Document Header Bar */}
        <div className="form-header-bar">
          <div className="form-header-title">
            <div className="form-title-row">
              <h1>{formData.poNumber || 'New Purchase Order'}</h1>
              {currentOrder && (
                <span className={`badge badge-doc-${currentOrder.status.toLowerCase()}`}>
                  {currentOrder.status === 'CONFIRMED' ? 'Confirmed' : currentOrder.status === 'CANCELLED' ? 'Cancelled' : 'Draft'}
                </span>
              )}
            </div>
            <p className="form-subtitle">
              {currentOrder ? `Purchase Order for ${currentOrder.vendorName}` : 'Create a new purchase order for supplier goods'}
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

            {isDraft && currentOrder && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmOrder}
                disabled={submitting}
              >
                Confirm
              </button>
            )}

            {isConfirmed && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateBill}
                disabled={submitting}
              >
                📦 Create Bill
              </button>
            )}

            {currentOrder && currentOrder.status !== 'CANCELLED' && (
              <button
                type="button"
                className="btn btn-outline text-danger"
                onClick={handleCancelOrder}
                disabled={submitting}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Warning Banner (Non-blocking budget exceeded) */}
        {warningMessage && (
          <div className="budget-warning-banner">
            <span className="warning-icon">⚠</span>
            <div className="warning-text">
              <strong>Budget Warning</strong>
              <p>{warningMessage}</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && <div className="form-error-banner">{error}</div>}

        {/* Document Card */}
        <div className="po-document-card">
          <div className="po-doc-header-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="po-no">
                PO No.
              </label>
              <input
                id="po-no"
                type="text"
                className="form-input"
                value={formData.poNumber}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="vendor-name">
                Vendor Name <span className="required">*</span>
              </label>
              <select
                id="vendor-name"
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
              <label className="form-label" htmlFor="po-date">
                PO Date <span className="required">*</span>
              </label>
              <input
                id="po-date"
                type="date"
                className="form-input"
                value={formData.poDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, poDate: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="po-lines-section">
            <div className="lines-section-header">
              <h3>Order Lines</h3>
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
                    <th style={{ width: '30%' }}>Product <span className="required">*</span></th>
                    <th style={{ width: '25%' }}>Budget Analytics</th>
                    <th style={{ width: '12%', textAlign: 'right' }}>Qty</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Unit Price ($)</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Total ($)</th>
                    {!isReadOnly && <th style={{ width: '3%' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, idx) => (
                    <tr key={line.id || idx}>
                      <td>
                        <select
                          className="form-select line-select"
                          value={line.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          disabled={isReadOnly}
                        >
                          <option value="">Select product...</option>
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

            {/* Document Footer Summary */}
            <div className="po-doc-footer">
              <div className="po-doc-footer-spacer"></div>
              <div className="po-totals-card">
                <div className="totals-row grand-total-row">
                  <span className="totals-label">Total:</span>
                  <span className="totals-amount">
                    ${computeGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- LIST VIEW (DEFAULT) ---
  return (
    <div className="purchase-page">
      <ListView
        title="Purchase Orders"
        subtitle="Manage vendor purchase orders, budget checks, and bill creation"
        data={orders}
        columns={columns}
        viewMode={viewMode}
        onNew={handleNew}
        onRowClick={handleRowClick}
        searchPlaceholder="Search POs by number or vendor..."
      />
    </div>
  );
}
