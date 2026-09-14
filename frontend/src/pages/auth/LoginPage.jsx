import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Pre-fill valid Admin credentials by default per user request
  const [loginId, setLoginId] = useState('admin1');
  const [password, setPassword] = useState('Admin@123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginId.trim() || !password.trim()) {
      setError('Please enter both Login Id and Password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(loginId.trim(), password);
      if (user.role === 'Contact' || user.role === 'ContactUser') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid Login Id or Password');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper buttons ONLY populate fields — they DO NOT auto-submit
  const handleFillCredentials = (id, pass) => {
    setLoginId(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1 className="auth-brand-name">Urban Furniture</h1>
          <p className="auth-brand-sub">Accounting system</p>
        </div>

        {/* Demo Helper Buttons (Fill inputs only) */}
        <div className="demo-credentials-box">
          <div className="demo-credentials-title">📌 Fill Quick Credentials</div>
          <div className="demo-btn-group demo-btn-group-two flex gap-2">
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleFillCredentials('admin1', 'Admin@123!')}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleFillCredentials('user1', 'User@123!')}
            >
              👤 User
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleFillCredentials('contact@acmefurniture.com', 'Contact@123!')}
            >
              🏢 Portal
            </button>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="auth-error-banner" role="alert" id="login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="login-id">
              Login Id
            </label>
            <input
              id="login-id"
              className="form-input"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="Enter login Id"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="password-field">
              <input
                id="login-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
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
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={submitting}
            id="sign-in-btn"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="auth-links">
            <Link to="/forgot-password" id="forgot-password-link">
              Forgot password?
            </Link>
            <Link to="/signup" id="sign-up-link">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
