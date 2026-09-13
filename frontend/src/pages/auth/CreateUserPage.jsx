import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  validateLoginId,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
} from '../../utils/validation';
import './Auth.css';

export default function CreateUserPage() {
  const { createUser } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState({
    name: '',
    loginId: '',
    email: '',
    role: 'Accountant',
    password: '',
    rePassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field) => (e) => {
    setFields((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errs = {};

    if (!fields.name.trim()) errs.name = 'Name is required.';

    const loginIdErr = validateLoginId(fields.loginId);
    if (loginIdErr) errs.loginId = loginIdErr;

    const emailErr = validateEmail(fields.email);
    if (emailErr) errs.email = emailErr;

    const passwordErr = validatePassword(fields.password);
    if (passwordErr) errs.password = passwordErr;

    const matchErr = validatePasswordMatch(fields.password, fields.rePassword);
    if (matchErr) errs.rePassword = matchErr;

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccess('');

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const user = await createUser(
        fields.name.trim(),
        fields.loginId.trim(),
        fields.email.trim(),
        fields.role,
        fields.password
      );
      setSuccess(`User "${user.name || user.loginId}" created successfully.`);
      // Reset form
      setFields({
        name: '',
        loginId: '',
        email: '',
        role: 'Accountant',
        password: '',
        rePassword: '',
      });
      setErrors({});
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="page-content" id="create-user-page">
      <div className="page-header">
        <h1 className="page-title">Create user</h1>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {serverError && (
              <div className="auth-error-banner" role="alert" id="create-user-error">
                {serverError}
              </div>
            )}
            {success && (
              <div className="auth-success-banner" id="create-user-success">
                {success}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="cu-name">
                Name
              </label>
              <input
                id="cu-name"
                className={`form-input ${errors.name ? 'is-error' : ''}`}
                type="text"
                value={fields.name}
                onChange={handleChange('name')}
                placeholder="Full name"
                autoFocus
              />
              <span className="form-error">{errors.name || ''}</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cu-login-id">
                Login Id
              </label>
              <input
                id="cu-login-id"
                className={`form-input ${errors.loginId ? 'is-error' : ''}`}
                type="text"
                value={fields.loginId}
                onChange={handleChange('loginId')}
                placeholder="6–12 characters"
              />
              <span className="form-error">{errors.loginId || ''}</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cu-email">
                E-mail Id
              </label>
              <input
                id="cu-email"
                className={`form-input ${errors.email ? 'is-error' : ''}`}
                type="email"
                value={fields.email}
                onChange={handleChange('email')}
                placeholder="you@example.com"
              />
              <span className="form-error">{errors.email || ''}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="role"
                    value="Accountant"
                    checked={fields.role === 'Accountant'}
                    onChange={handleChange('role')}
                  />
                  User (Invoicing)
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="role"
                    value="Admin"
                    checked={fields.role === 'Admin'}
                    onChange={handleChange('role')}
                  />
                  Administrator
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cu-password">
                Password
              </label>
              <div className="password-field">
                <input
                  id="cu-password"
                  className={`form-input ${errors.password ? 'is-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={fields.password}
                  onChange={handleChange('password')}
                  placeholder="Min 8 chars, upper + lower + special"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '◠' : '◡'}
                </button>
              </div>
              <span className="form-error">{errors.password || ''}</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cu-re-password">
                Re-Enter Password
              </label>
              <div className="password-field">
                <input
                  id="cu-re-password"
                  className={`form-input ${errors.rePassword ? 'is-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={fields.rePassword}
                  onChange={handleChange('rePassword')}
                  placeholder="Re-enter password"
                />
              </div>
              <span className="form-error">{errors.rePassword || ''}</span>
            </div>

            <div className="page-actions" style={{ justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                id="cu-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                id="cu-create-btn"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
