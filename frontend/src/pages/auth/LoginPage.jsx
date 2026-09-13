import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
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
      // Contact User goes to portal, others go to dashboard
      if (user.role === 'ContactUser') {
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

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1 className="auth-brand-name">Urban Furniture</h1>
          <p className="auth-brand-sub">Accounting system</p>
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
              placeholder="Enter your login Id"
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
                placeholder="Enter your password"
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
