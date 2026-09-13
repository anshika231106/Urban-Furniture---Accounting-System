import { useNavigate } from 'react-router-dom';

/**
 * Placeholder page for modules not yet built.
 * Shows a friendly message instead of a blank screen.
 */
export default function PlaceholderPage({ title, icon }) {
  const navigate = useNavigate();

  return (
    <div className="placeholder-page" id="placeholder-page">
      <div className="placeholder-icon" aria-hidden="true">
        {icon || '🚧'}
      </div>
      <h2 className="placeholder-title">{title || 'Coming soon'}</h2>
      <p className="placeholder-text">
        This module is being built. Check back after the next phase is complete.
      </p>
      <button
        className="btn btn-secondary"
        style={{ marginTop: 'var(--space-6)' }}
        onClick={() => navigate('/')}
      >
        Back to dashboard
      </button>
    </div>
  );
}
