import './ViewToggle.css';

export default function ViewToggle({ viewMode, onViewChange }) {
  return (
    <div className="view-toggle" role="group" aria-label="View mode toggle">
      <button
        type="button"
        className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => onViewChange('list')}
        title="List view"
        aria-label="List view"
      >
        <span className="toggle-icon">☰</span>
        <span className="toggle-label">List</span>
      </button>
      <button
        type="button"
        className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
        onClick={() => onViewChange('kanban')}
        title="Kanban view"
        aria-label="Kanban view"
      >
        <span className="toggle-icon">▦</span>
        <span className="toggle-label">Kanban</span>
      </button>
    </div>
  );
}
