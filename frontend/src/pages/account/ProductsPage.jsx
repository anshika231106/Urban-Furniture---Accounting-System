import { useState, useEffect } from 'react';
import ListView from '../../components/common/ListView';
import KanbanView from '../../components/common/KanbanView';
import CategoryModal from '../../components/common/CategoryModal';
import './ProductsPage.css';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban' | 'form'
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline Category Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'Goods',
    category: 'General',
    salesPrice: '',
    cost: '',
    imageUrl: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pRes, cRes] = await Promise.all([
        fetch('/api/products', { headers }),
        fetch('/api/categories', { headers }),
      ]);

      if (!pRes.ok || !cRes.ok) throw new Error('Failed to load product data.');

      const pData = await pRes.json();
      const cData = await cRes.json();

      setProducts(pData);
      setCategories(cData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open blank form for New product
  const handleNew = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      type: 'Goods',
      category: categories.length > 0 ? categories[0].name : 'General',
      salesPrice: '',
      cost: '',
      imageUrl: '',
    });
    setFormError('');
    setViewMode('form');
  };

  // Open existing product in Form view
  const handleRowClick = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      type: product.type || 'Goods',
      category: product.category || 'General',
      salesPrice: product.salesPrice !== undefined ? product.salesPrice : '',
      cost: product.cost !== undefined ? product.cost : '',
      imageUrl: product.imageUrl || '',
    });
    setFormError('');
    setViewMode('form');
  };

  // Handle Form Submit (Confirm button)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (formData.salesPrice === '' || Number(formData.salesPrice) < 0) {
      setFormError('Please enter a valid Sales Price.');
      return;
    }
    if (formData.cost === '' || Number(formData.cost) < 0) {
      setFormError('Please enter a valid Cost.');
      return;
    }

    setFormSubmitting(true);
    try {
      const token = localStorage.getItem('uf_token');
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          category: formData.category,
          salesPrice: Number(formData.salesPrice),
          cost: Number(formData.cost),
          imageUrl: formData.imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product.');

      // Refresh list
      await fetchData();
      setViewMode('list');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Image Upload handler (Base64 data URL preview)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Category Selection Change
  const handleCategorySelectChange = (e) => {
    const val = e.target.value;
    if (val === '__CREATE_NEW__') {
      setIsCategoryModalOpen(true);
    } else {
      setFormData((prev) => ({ ...prev, category: val }));
    }
  };

  // Inline Category Created Callback
  const handleCategoryCreated = (newCat) => {
    setCategories((prev) => [...prev, newCat]);
    setFormData((prev) => ({ ...prev, category: newCat.name }));
  };

  // Table Columns config for ListView
  const columns = [
    {
      key: 'product',
      label: 'Product',
      render: (p) => (
        <div className="product-table-cell">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} className="product-avatar" />
          ) : (
            <div className="product-avatar-placeholder">📦</div>
          )}
          <span className="product-cell-name">{p.name}</span>
        </div>
      ),
    },
    { key: 'category', label: 'Category' },
    {
      key: 'type',
      label: 'Type',
      render: (p) => (
        <span className={`badge badge-type badge-${p.type.toLowerCase()}`}>
          {p.type}
        </span>
      ),
    },
    {
      key: 'salesPrice',
      label: 'Sales Price',
      numeric: true,
      render: (p) => `$${Number(p.salesPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'cost',
      label: 'Cost',
      numeric: true,
      render: (p) => `$${Number(p.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
  ];

  if (loading) {
    return (
      <div className="products-page-loading">
        <div className="auth-loading-spinner"></div>
        <p>Loading Product Master...</p>
      </div>
    );
  }

  // --- FORM VIEW ---
  if (viewMode === 'form') {
    return (
      <div className="product-form-container">
        {/* Document Header Bar */}
        <div className="form-header-bar">
          <div className="form-header-title">
            <h1>{editingProduct ? 'Edit Product' : 'New Product'}</h1>
            <p className="form-subtitle">
              {editingProduct ? editingProduct.name : 'Create a master product record'}
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFormSubmit}
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>

        {/* Form Body Document Card */}
        <div className="product-form-card">
          {formError && <div className="form-error-banner">{formError}</div>}

          <form onSubmit={handleFormSubmit} className="product-form-grid">
            {/* Left Section — Main Product Fields */}
            <div className="form-left-col">
              <div className="form-group">
                <label className="form-label" htmlFor="p-name">
                  Product Name <span className="required">*</span>
                </label>
                <input
                  id="p-name"
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Ergonomic Executive Chair"
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-type">
                    Product Type <span className="required">*</span>
                  </label>
                  <select
                    id="p-type"
                    className="form-select"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value }))
                    }
                  >
                    <option value="Goods">Goods</option>
                    <option value="Service">Service</option>
                    <option value="Combo">Combo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="p-category">
                    Category <span className="required">*</span>
                  </label>
                  <select
                    id="p-category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleCategorySelectChange}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__CREATE_NEW__">
                      ➕ Create New Category...
                    </option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-sales-price">
                    Sales Price ($) <span className="required">*</span>
                  </label>
                  <input
                    id="p-sales-price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formData.salesPrice}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, salesPrice: e.target.value }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="p-cost">
                    Cost ($) <span className="required">*</span>
                  </label>
                  <input
                    id="p-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cost: e.target.value }))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Right Section — Image Upload */}
            <div className="form-right-col">
              <div className="image-upload-container">
                <label className="form-label">Product Image</label>
                <div className="image-preview-box">
                  {formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      alt="Product preview"
                      className="image-preview-img"
                    />
                  ) : (
                    <div className="image-placeholder">
                      <span className="placeholder-icon">📷</span>
                      <span className="placeholder-text">No image uploaded</span>
                    </div>
                  )}
                </div>
                <div className="image-upload-actions">
                  <label className="btn btn-outline btn-sm upload-btn">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      hidden
                    />
                  </label>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      className="btn btn-text text-danger btn-sm"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, imageUrl: '' }))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Inline Category Creation Modal */}
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoryCreated={handleCategoryCreated}
        />
      </div>
    );
  }

  // --- KANBAN VIEW ---
  if (viewMode === 'kanban') {
    return (
      <div className="products-page">
        <KanbanView
          title="Product Master"
          subtitle="Manage catalog items, goods, services, and prices"
          data={products}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onNew={handleNew}
          onCardClick={handleRowClick}
          searchPlaceholder="Search products by name or category..."
          renderCard={(p) => (
            <div className="product-kanban-card">
              <div className="kanban-image-wrap">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="kanban-img" />
                ) : (
                  <div className="kanban-img-placeholder">📦</div>
                )}
                <span className={`kanban-badge type-${p.type.toLowerCase()}`}>
                  {p.type}
                </span>
              </div>
              <div className="kanban-details">
                <h3 className="kanban-product-name">{p.name}</h3>
                <div className="kanban-category">{p.category}</div>
                <div className="kanban-price-row">
                  <div className="price-item">
                    <span className="price-label">Sales Price</span>
                    <span className="price-value sales-price">
                      ${Number(p.salesPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="price-item">
                    <span className="price-label">Cost</span>
                    <span className="price-value cost-price">
                      ${Number(p.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        />
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoryCreated={handleCategoryCreated}
        />
      </div>
    );
  }

  // --- LIST VIEW (DEFAULT) ---
  return (
    <div className="products-page">
      <ListView
        title="Product Master"
        subtitle="Manage catalog items, goods, services, and prices"
        data={products}
        columns={columns}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onNew={handleNew}
        onRowClick={handleRowClick}
        searchPlaceholder="Search products by name, category, type..."
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
}
