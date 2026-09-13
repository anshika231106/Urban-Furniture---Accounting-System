import { useState } from 'react';
import ViewToggle from './ViewToggle';
import './KanbanView.css';

/**
 * Generic KanbanView component according to MVP.md and SKILL.md rules.
 * Accepts renderCard prop or renders default card layout.
 */
export default function KanbanView({
  title,
  subtitle,
  data = [],
  viewMode = 'kanban',
  onViewChange,
  onNew,
  onCardClick,
  searchPlaceholder = 'Search cards...',
  renderCard,
  extraHeaderActions,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(item).some((val) =>
      String(val || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="kanban-view-container">
      {/* Header bar */}
      <div className="kanban-view-header">
        <div className="kanban-view-title-group">
          <h1 className="kanban-view-title">{title}</h1>
          {subtitle && <p className="kanban-view-subtitle">{subtitle}</p>}
        </div>

        <div className="kanban-view-actions">
          {extraHeaderActions}
          {onViewChange && (
            <ViewToggle viewMode={viewMode} onViewChange={onViewChange} />
          )}
          {onNew && (
            <button type="button" className="btn btn-primary" onClick={onNew}>
              + New
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="kanban-view-toolbar">
        <div className="kanban-view-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
        <div className="kanban-view-count">
          Showing {filteredData.length} of {data.length} items
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredData.length === 0 ? (
        <div className="kanban-empty-state">
          <span className="empty-icon">📦</span>
          <p>No items found</p>
          {onNew && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onNew}
            >
              Create first record
            </button>
          )}
        </div>
      ) : (
        <div className="kanban-grid">
          {filteredData.map((item) => (
            <div
              key={item.id}
              className="kanban-card"
              onClick={() => onCardClick && onCardClick(item)}
            >
              {renderCard ? renderCard(item) : (
                <div className="kanban-card-content">
                  <h3>{item.name || item.title}</h3>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
