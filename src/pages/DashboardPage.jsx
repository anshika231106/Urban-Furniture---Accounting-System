import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

/**
 * Dashboard — home screen per MVP.md Section 3.
 * Shows 3 summary cards: Sales, Purchase, Budget Reports.
 * Counts are 0 for now — will be wired to real data in later phases.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const greeting = getGreeting();
  const displayName = user?.name || user?.loginId || 'there';

  return (
    <div className="dashboard" id="dashboard-page">
      <div className="dashboard-greeting">
        <h1>
          {greeting}, {displayName}
        </h1>
        <p>Here is what is happening across your accounts today.</p>
      </div>

      <div className="dashboard-cards">
        {/* Sales card */}
        <div className="dashboard-card dashboard-card--sales" id="card-sales">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">
              <span className="dashboard-card-icon" aria-hidden="true">
                📊
              </span>
              Sales
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/sales/orders')}
              id="sales-new-btn"
            >
              New
            </button>
          </div>
          <div className="dashboard-card-body">
            <div className="dashboard-stats">
              <div
                className="dashboard-stat"
                onClick={() => navigate('/sales/orders')}
                id="sales-stat-all"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">All</div>
              </div>
              <div
                className="dashboard-stat"
                onClick={() => navigate('/sales/orders?status=confirmed')}
                id="sales-stat-confirmed"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">Confirmed</div>
              </div>
              <div
                className="dashboard-stat"
                onClick={() => navigate('/sales/orders?status=draft')}
                id="sales-stat-draft"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">Draft</div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase card */}
        <div
          className="dashboard-card dashboard-card--purchase"
          id="card-purchase"
        >
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">
              <span className="dashboard-card-icon" aria-hidden="true">
                🛒
              </span>
              Purchase
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/purchase/orders')}
              id="purchase-new-btn"
            >
              New
            </button>
          </div>
          <div className="dashboard-card-body">
            <div className="dashboard-stats">
              <div
                className="dashboard-stat"
                onClick={() => navigate('/purchase/orders')}
                id="purchase-stat-all"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">All</div>
              </div>
              <div
                className="dashboard-stat"
                onClick={() => navigate('/purchase/orders?status=confirmed')}
                id="purchase-stat-confirmed"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">Confirmed</div>
              </div>
              <div
                className="dashboard-stat"
                onClick={() => navigate('/purchase/orders?status=draft')}
                id="purchase-stat-draft"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">Draft</div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Reports card */}
        <div
          className="dashboard-card dashboard-card--budget"
          id="card-budget"
        >
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">
              <span className="dashboard-card-icon" aria-hidden="true">
                🎯
              </span>
              Budget Reports
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/reports/budget')}
              id="budget-report-btn"
            >
              Report
            </button>
          </div>
          <div className="dashboard-card-body">
            <div className="dashboard-stats">
              <div
                className="dashboard-stat"
                onClick={() => navigate('/reports/budget')}
                id="budget-stat-achieved"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">Achieved</div>
              </div>
              <div
                className="dashboard-stat"
                onClick={() => navigate('/reports/budget')}
                id="budget-stat-budget"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">Budget</div>
              </div>
              <div
                className="dashboard-stat"
                onClick={() => navigate('/reports/budget')}
                id="budget-stat-committed"
              >
                <div className="dashboard-stat-value">0</div>
                <div className="dashboard-stat-label">Committed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
