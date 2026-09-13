import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Stub: in MVP we just show a success message
    setSubmitted(true);
  };

  return (
    <div className="auth-page" id="forgot-password-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1 className="auth-brand-name">Urban Furniture</h1>
          <p className="auth-brand-sub">Reset your password</p>
        </div>

        {submitted ? (
          <div className="auth-success-banner" id="forgot-success">
            If an account with that email exists, a reset link has been sent.
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="auth-error-banner" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">
                Email address
              </label>
              <input
                id="forgot-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              id="reset-btn"
            >
              Send reset link
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
