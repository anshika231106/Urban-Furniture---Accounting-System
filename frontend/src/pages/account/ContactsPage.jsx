import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ListView from '../../components/common/ListView';
import KanbanView from '../../components/common/KanbanView';
import './ContactsPage.css';

const DEFAULT_FORM = {
  name: '',
  type: 'Customer',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  imageUrl: '',
  portalAccessRequested: false,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toFormData(contact) {
  return {
    name: contact.name || '',
    type: contact.type || 'Customer',
    email: contact.email || '',
    phone: contact.phone || '',
    street: contact.street || '',
    city: contact.city || '',
    state: contact.state || '',
    country: contact.country || '',
    pincode: contact.pincode || '',
    imageUrl: contact.imageUrl || '',
    portalAccessRequested: Boolean(contact.portalAccessRequested),
  };
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban' | 'form'
  const [editingContact, setEditingContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [initialFormData, setInitialFormData] = useState(DEFAULT_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('uf_token');
      const res = await fetch('/api/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load contacts.');
      setContacts(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const handleBackToList = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them and go back?')) {
      return;
    }
    setViewMode('list');
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleNew = () => {
    setEditingContact(null);
    setFormData(DEFAULT_FORM);
    setInitialFormData(DEFAULT_FORM);
    setFormError('');
    setEmailError('');
    setViewMode('form');
  };

  const handleRowClick = (contact) => {
    const data = toFormData(contact);
    setEditingContact(contact);
    setFormData(data);
    setInitialFormData(data);
    setFormError('');
    setEmailError('');
    setViewMode('form');
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'email') setEmailError('');
  };

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

  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    setFormError('');
    setEmailError('');

    if (!formData.name.trim()) {
      setFormError('Contact Name is required.');
      return;
    }
    if (!formData.type) {
      setFormError('Type is required.');
      return;
    }
    if (!formData.email.trim()) {
      setEmailError('Email is required.');
      return;
    }
    if (!EMAIL_PATTERN.test(formData.email.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setFormSubmitting(true);
    try {
      const token = localStorage.getItem('uf_token');
      const isEditing = Boolean(editingContact);
      const url = isEditing ? `/api/contacts/${editingContact.id}` : '/api/contacts';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          email: formData.email.trim(),
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.pincode,
          imageUrl: formData.imageUrl,
          portalAccessRequested: formData.portalAccessRequested,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (/email/i.test(data.error || '')) {
          setEmailError(data.error);
        } else {
          setFormError(data.error || 'Failed to save contact.');
        }
        return;
      }

      await fetchContacts();
      setViewMode('list');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'image',
      label: 'Image',
      render: (c) =>
        c.imageUrl ? (
          <img src={c.imageUrl} alt={c.name} className="contact-avatar" />
        ) : (
          <div className="contact-avatar-placeholder">👤</div>
        ),
    },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: (c) => c.phone || '—' },
  ];

  if (loading) {
    return (
      <div className="contacts-page-loading">
        <div className="auth-loading-spinner"></div>
        <p>Loading Contact Master...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contacts-page-loading">
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <p style={{ color: 'var(--accent-danger)' }}>{error}</p>
        <button type="button" className="btn btn-outline" onClick={fetchContacts}>
          Retry
        </button>
      </div>
    );
  }

  // --- FORM VIEW ---
  if (viewMode === 'form') {
    return (
      <div className="contact-form-container">
        <div className="form-header-bar">
          <div className="form-header-title">
            <h1>{editingContact ? 'Edit Contact' : 'New Contact'}</h1>
            <p className="form-subtitle">
              {editingContact ? editingContact.name : 'Create a master contact record'}
            </p>
          </div>
          <div className="form-header-actions">
            <button type="button" className="btn btn-outline" onClick={handleBackToList}>
              ← Back
            </button>
            <button type="button" className="btn btn-outline" onClick={handleNew}>
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

        <div className="contact-form-card">
          {formError && <div className="form-error-banner">{formError}</div>}

          <form onSubmit={handleFormSubmit} className="contact-form-grid">
            <div className="form-left-col">
              <div className="form-group">
                <label className="form-label" htmlFor="c-name">
                  Contact Name <span className="required">*</span>
                </label>
                <input
                  id="c-name"
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Acme Furniture Supplies"
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="c-type">
                    Type <span className="required">*</span>
                  </label>
                  <select
                    id="c-type"
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => updateField('type', e.target.value)}
                  >
                    <option value="Customer">Customer</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Both">Both</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="c-email">
                    Email <span className="required">*</span>
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    className={`form-input ${emailError ? 'input-error' : ''}`}
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="name@company.com"
                    required
                  />
                  {emailError && <span className="field-error">{emailError}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="c-phone">Phone</label>
                <input
                  id="c-phone"
                  type="text"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="e.g. +1 555 123 4567"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <div className="form-row-2">
                  <input
                    type="text"
                    className="form-input"
                    value={formData.street}
                    onChange={(e) => updateField('street', e.target.value)}
                    placeholder="Street"
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="form-row-2 address-row-2">
                  <input
                    type="text"
                    className="form-input"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="State"
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder="Country"
                  />
                </div>
                <div className="address-row-2">
                  <input
                    type="text"
                    className="form-input"
                    value={formData.pincode}
                    onChange={(e) => updateField('pincode', e.target.value)}
                    placeholder="Pincode"
                  />
                </div>
              </div>

              <div className="form-group portal-access-group">
                <label
                  className={`portal-access-checkbox ${!formData.email.trim() ? 'disabled' : ''}`}
                  title={!formData.email.trim() ? 'Enter an email address first' : ''}
                >
                  <input
                    type="checkbox"
                    checked={formData.portalAccessRequested}
                    disabled={!formData.email.trim()}
                    onChange={(e) => updateField('portalAccessRequested', e.target.checked)}
                  />
                  Give portal access
                </label>
              </div>
            </div>

            <div className="form-right-col">
              <div className="image-upload-container">
                <label className="form-label">Contact Image</label>
                <div className="image-preview-box">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Contact preview" className="image-preview-img" />
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
                    <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                  </label>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      className="btn btn-text text-danger btn-sm"
                      onClick={() => updateField('imageUrl', '')}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- KANBAN VIEW ---
  if (viewMode === 'kanban') {
    return (
      <div className="contacts-page">
        <KanbanView
          title="Contact Master"
          subtitle="Manage customers, vendors, and contact records"
          data={contacts}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onNew={handleNew}
          onBack={handleBackToDashboard}
          onCardClick={handleRowClick}
          searchPlaceholder="Search contacts by name or email..."
          emptyMessage="No contacts yet — click New to add one"
          renderCard={(c) => (
            <div className="contact-kanban-card">
              {c.imageUrl ? (
                <img src={c.imageUrl} alt={c.name} className="contact-kanban-img" />
              ) : (
                <div className="contact-kanban-img-placeholder">👤</div>
              )}
              <div className="contact-kanban-details">
                <h3 className="contact-kanban-name">{c.name}</h3>
                <div className="contact-kanban-email">{c.email}</div>
                <div className="contact-kanban-phone">{c.phone || '—'}</div>
              </div>
            </div>
          )}
        />
      </div>
    );
  }

  // --- LIST VIEW (DEFAULT) ---
  return (
    <div className="contacts-page">
      <ListView
        title="Contact Master"
        subtitle="Manage customers, vendors, and contact records"
        data={contacts}
        columns={columns}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onNew={handleNew}
        onBack={handleBackToDashboard}
        onRowClick={handleRowClick}
        searchPlaceholder="Search contacts by name or email..."
        emptyMessage="No contacts yet — click New to add one"
      />
    </div>
  );
}
