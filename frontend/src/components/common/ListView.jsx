import { useState } from 'react';
import ViewToggle from './ViewToggle';
import './ListView.css';

/**
 * Generic ListView component according to MVP.md and SKILL.md rules.
 * Supports: search, selection checkboxes, custom action buttons, List/Kanban view toggle, column rendering.
 */
export default function ListView({
  title,
  subtitle,
  data = [],
  columns = [],
  viewMode = 'list',
  onViewChange,
  onNew,
  onBack,
  onRowClick,
  searchPlaceholder = 'Search records...',
  extraHeaderActions,
  emptyMessage = 'No records found',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Search filter
  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return columns.some((col) => {
      const val = col.accessor ? col.accessor(item) : item[col.key];
      return String(val || '').toLowerCase().includes(query);
    });
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredData.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  return (
    <div className="list-view-container">
      {/* Header bar */}
      <div className="list-view-header">
        <div className="list-view-title-group">
          <h1 className="list-view-title">{title}</h1>
          {subtitle && <p className="list-view-subtitle">{subtitle}</p>}
        </div>

        <div className="list-view-actions">
          {onBack && (
            <button type="button" className="btn btn-outline" onClick={onBack}>
              ← Back
            </button>
          )}
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

      {/* Search & filter bar */}
      <div className="list-view-toolbar">
        <div className="list-view-search">
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
        <div className="list-view-count">
          Showing {filteredData.length} of {data.length} records
        </div>
      </div>

      {/* Table */}
      <div className="list-view-table-wrapper">
        <table className="list-view-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  checked={
                    filteredData.length > 0 &&
                    selectedIds.length === filteredData.length
                  }
                  onChange={handleSelectAll}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.numeric ? 'text-right' : 'text-left'}
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="empty-table-cell">
                  <div className="empty-table-state">
                    <span className="empty-icon">📂</span>
                    <p>{emptyMessage}</p>
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
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`list-view-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onRowClick && onRowClick(item)}
                  >
                    <td
                      className="td-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(e, item.id)}
                      />
                    </td>
                    {columns.map((col) => {
                      const cellValue = col.render
                        ? col.render(item)
                        : col.accessor
                        ? col.accessor(item)
                        : item[col.key];

                      return (
                        <td
                          key={col.key}
                          className={col.numeric ? 'text-right' : 'text-left'}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
