import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { validateLoginId, validateEmail, validatePassword } from '../../utils/validation';
import './Auth.css';

export default function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState({
    loginId: '',
    email: '',
    password: '',
    rePassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field) => (e) => {
    setFields((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errs = {};

    const loginIdErr = validateLoginId(fields.loginId);
    if (loginIdErr) errs.loginId = loginIdErr;

    const emailErr = validateEmail(fields.email);
    if (emailErr) errs.email = emailErr;

    const passwordErr = validatePassword(fields.password);
    if (passwordErr) errs.password = passwordErr;

    if (fields.password !== fields.rePassword) {
      errs.rePassword = 'Passwords do not match.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      await signup(fields.loginId.trim(), fields.email.trim(), fields.password);
      navigate('/');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page" id="signup-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1 className="auth-brand-name">Urban Furniture</h1>
          <p className="auth-brand-sub">Create your account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="auth-error-banner" role="alert" id="signup-error">
              {serverError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="signup-login-id">
              Enter Login Id
            </label>
            <input
              id="signup-login-id"
              className={`form-input ${errors.loginId ? 'is-error' : ''}`}
              type="text"
              value={fields.loginId}
              onChange={handleChange('loginId')}
              placeholder="6–12 characters"
              autoComplete="username"
              autoFocus
            />
            <span className="form-error">{errors.loginId || ''}</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">
              Enter Email Id
            </label>
            <input
              id="signup-email"
              className={`form-input ${errors.email ? 'is-error' : ''}`}
              type="email"
              value={fields.email}
              onChange={handleChange('email')}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <span className="form-error">{errors.email || ''}</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">
              Enter Password
            </label>
            <div className="password-field">
              <input
                id="signup-password"
                className={`form-input ${errors.password ? 'is-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={fields.password}
                onChange={handleChange('password')}
                placeholder="Min 8 chars, upper + lower + special"
                autoComplete="new-password"
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
            <label className="form-label" htmlFor="signup-re-password">
              Re-Enter Password
            </label>
            <div className="password-field">
              <input
                id="signup-re-password"
                className={`form-input ${errors.rePassword ? 'is-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={fields.rePassword}
                onChange={handleChange('rePassword')}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </div>
            <span className="form-error">{errors.rePassword || ''}</span>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={submitting}
            id="sign-up-btn"
          >
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" id="login-link">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
