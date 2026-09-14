import { useEffect, useRef, useState } from 'react';
import ListView from '../../components/common/ListView';
import KanbanView from '../../components/common/KanbanView';
import './BudgetReportPage.css';

const STATUSES = ['', 'DRAFT', 'CONFIRMED', 'REVISED', 'CANCELLED'];
const money = (value) => Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const date = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
const inputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

export default function BudgetReportPage() {
  const [mode, setMode] = useState('list');
  const [view, setView] = useState('list');
  const [status, setStatus] = useState('');
  const [budgets, setBudgets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState({ responsible: [], analyticAccounts: [] });
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => { loadBudgets(); loadOptions(); }, [status]);

  useEffect(() => {
    if (!success) return undefined;
    const timeoutId = window.setTimeout(() => setSuccess(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  async function request(url, init = {}) {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('uf_token')}`,
        ...(init.headers || {}),
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  async function loadBudgets() {
    setLoading(true);
    setError('');
    try {
      const data = await request(`/api/budgets${status ? `?status=${status}` : ''}`);
      setBudgets(data.budgets);
      if (selected) setSelected(data.budgets.find((budget) => budget.id === selected.id) || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try { setOptions(await request('/api/budgets/options')); } catch (err) { setError(err.message); }
  }

  function openNew() {
    setError('');
    setSuccess('');
    setSelected({ name: '', startDate: '', endDate: '', responsibleId: '', status: 'DRAFT', revisionOf: null, revisedBy: null, lines: [{ analyticAccountId: '', type: 'INCOME', committedAmount: '' }] });
    setActivity(null);
    setMode('form');
  }

  async function openBudget(budget) {
    const sequence = ++requestSequence.current;
    setError('');
    setActivity(null);
    setSelected(budget);
    setMode('detail');
    try {
      const details = await request(`/api/budgets/${budget.id}`);
      if (sequence === requestSequence.current) setSelected(details);
    } catch (err) {
      if (sequence === requestSequence.current) setError(err.message);
    }
  }

  async function saveBudget(payload) {
    try {
      const isUpdate = Boolean(selected.id);
      const saved = await request(isUpdate ? `/api/budgets/${selected.id}` : '/api/budgets', { method: isUpdate ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      await loadBudgets();
      setSelected(null);
      setMode('list');
      setSuccess(isUpdate ? 'Budget updated successfully.' : 'Budget created successfully.');
      return saved;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function lifecycle(action, body = {}) {
    if (actionSubmitting) return;
    setActionSubmitting(true);
    try {
      const saved = await request(`/api/budgets/${selected.id}/${action}`, { method: 'POST', body: JSON.stringify(body) });
      setSelected(saved);
      await loadBudgets();
      setMode(action === 'revise' ? 'form' : 'detail');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  }

  async function openActivity(line) {
    try { setActivity(await request(`/api/budgets/${selected.id}/lines/${line.id}/activity`)); } catch (err) { setError(err.message); }
  }

  if (mode === 'form') return <BudgetForm budget={selected} options={options} onBack={() => setMode(selected?.id ? 'detail' : 'list')} onSave={saveBudget} />;
  if (mode === 'detail' && selected) return <BudgetDetail budget={selected} activity={activity} actionSubmitting={actionSubmitting} onBack={() => { ++requestSequence.current; setActivity(null); setSelected(null); setMode('list'); }} onEdit={() => setMode('form')} onAction={lifecycle} onActivity={openActivity} />;

  const statusFilter = <select aria-label="Filter budget status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{STATUSES.slice(1).map((value) => <option key={value} value={value}>{value}</option>)}</select>;
  const columns = [
    { key: 'name', label: 'Budget', render: (budget) => <><strong>{budget.name}</strong>{budget.revisionOf && <small>Revision of: {budget.revisionOf.name}</small>}</> },
    { key: 'startDate', label: 'Start Date', render: (budget) => date(budget.startDate) },
    { key: 'endDate', label: 'End Date', render: (budget) => date(budget.endDate) },
    { key: 'status', label: 'Status', render: (budget) => <StatusBadge status={budget.status} /> },
    { key: 'pie', label: 'Pie Chart', render: (budget) => <MiniPie budget={budget} /> },
  ];

  return <div className="budget-report-page">
    {error && <div className="budget-error">{error}</div>}
    {success && <div className="budget-success" role="status">{success}</div>}
    {loading ? <div className="budget-report-state">Loading budgets...</div> : view === 'list' ? <ListView title="Budget" subtitle="Plan, monitor, and review analytical budgets" data={budgets} columns={columns} viewMode={view} onViewChange={setView} onNew={openNew} onRowClick={openBudget} searchPlaceholder="Search budgets by name..." extraHeaderActions={statusFilter} /> : <KanbanView title="Budget" subtitle="Plan, monitor, and review analytical budgets" data={budgets} viewMode={view} onViewChange={setView} onNew={openNew} onCardClick={openBudget} searchPlaceholder="Search budgets by name..." extraHeaderActions={statusFilter} renderCard={(budget) => <><div className="budget-kanban-top"><strong>{budget.name}</strong><StatusBadge status={budget.status} /></div><p>{date(budget.startDate)} - {date(budget.endDate)}</p><div className="budget-kanban-summary"><span>Committed Amount</span><strong>{money(budget.committedAmount)}</strong></div></>} />}
  </div>;
}

function BudgetForm({ budget, options, onBack, onSave }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ...budget, startDate: inputDate(budget.startDate), endDate: inputDate(budget.endDate), lines: budget.lines.map((line) => ({ ...line, committedAmount: line.committedAmount })) });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateLine = (index, key, value) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));
  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSave({ name: form.name, startDate: form.startDate, endDate: form.endDate, responsibleId: form.responsibleId, lines: form.lines.map((line) => ({ analyticAccountId: line.analyticAccountId, type: line.type, committedAmount: Number(line.committedAmount) })) });
    } catch {
      // The parent displays the request error and keeps the form open.
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="budget-form-page"><div className="budget-form-header"><div><p className="budget-report-eyebrow">Analytical Budget</p><h1>{budget.id ? budget.name : 'New Budget'}</h1></div><div className="budget-form-actions"><button className="btn btn-outline" type="button" onClick={onBack} disabled={submitting}>Back</button><button className="btn btn-primary" type="submit" form="budget-form" disabled={submitting}>{submitting ? (budget.id ? 'Saving...' : 'Creating...') : (budget.id ? 'Save' : 'Create')}</button></div></div>{submitting && <div className="budget-submit-status" role="status">{budget.id ? 'Saving budget, please wait...' : 'Creating budget, please wait...'}</div>}<form id="budget-form" onSubmit={submit} className="budget-form"><div className="budget-form-grid"><label>Budget Name<input required value={form.name} onChange={(event) => update('name', event.target.value)} disabled={submitting} /></label><label>Budget Period<input required type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} disabled={submitting} /></label><label>To<input required type="date" value={form.endDate} onChange={(event) => update('endDate', event.target.value)} disabled={submitting} /></label><label>Responsible<select required value={form.responsibleId} onChange={(event) => update('responsibleId', event.target.value)} disabled={submitting}><option value="">Select Responsible</option>{options.responsible.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Revision Of<input readOnly value={form.revisionOf?.name || '-'} /></label><label>Revised With<input readOnly value={form.revisedBy?.name || '-'} /></label></div><div className="budget-lines-heading"><h2>Budget Lines</h2><button className="btn btn-outline btn-sm" type="button" disabled={submitting} onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, { analyticAccountId: '', type: 'INCOME', committedAmount: '' }] }))}>Add line</button></div><div className="budget-table-wrap"><table className="budget-table budget-edit-table"><thead><tr><th>Analytic Account</th><th>Type</th><th>Committed Amount</th><th /></tr></thead><tbody>{form.lines.map((line, index) => <tr key={index}><td><select required value={line.analyticAccountId} onChange={(event) => updateLine(index, 'analyticAccountId', event.target.value)} disabled={submitting}><option value="">Select Analytic Account</option>{options.analyticAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></td><td><select value={line.type} onChange={(event) => updateLine(index, 'type', event.target.value)} disabled={submitting}><option value="INCOME">Income</option><option value="EXPENSE">Expenses</option></select></td><td><input required min="0" type="number" value={line.committedAmount} onChange={(event) => updateLine(index, 'committedAmount', event.target.value)} disabled={submitting} /></td><td><button className="budget-icon-button" type="button" disabled={submitting} onClick={() => form.lines.length > 1 && setForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}>×</button></td></tr>)}</tbody></table></div></form></div>;
}

function BudgetDetail({ budget, activity, actionSubmitting, onBack, onEdit, onAction, onActivity }) { return <div className="budget-detail-page"><div className="budget-form-header"><div><p className="budget-report-eyebrow">Budget</p><h1>{budget.name}</h1></div><div className="budget-form-actions"><button className="btn btn-outline" type="button" onClick={onBack} disabled={actionSubmitting}>Back</button>{budget.status === 'DRAFT' && <><button className="btn btn-outline" type="button" onClick={onEdit} disabled={actionSubmitting}>Edit</button><button className="btn btn-primary" type="button" onClick={() => onAction('confirm')} disabled={actionSubmitting}>{actionSubmitting ? 'Confirming...' : 'Confirm'}</button></>}{budget.status === 'CONFIRMED' && <button className="btn btn-primary" type="button" onClick={() => onAction('revise')} disabled={actionSubmitting}>{actionSubmitting ? 'Revising...' : 'Revise'}</button>}{budget.status !== 'CANCELLED' && budget.status !== 'REVISED' && <button className="btn btn-danger" type="button" onClick={() => onAction('cancel')} disabled={actionSubmitting}>{actionSubmitting ? 'Cancelling...' : 'Cancel'}</button>}</div></div>{actionSubmitting && <div className="budget-submit-status" role="status">Updating budget, please wait...</div>}<div className="budget-detail-meta"><label>Budget Name<strong>{budget.name}</strong></label><label>Budget Period<strong>{date(budget.startDate)} - {date(budget.endDate)}</strong></label><label>Responsible<strong>{budget.responsible?.name}</strong></label><label>Revision Of<strong>{budget.revisionOf?.name || '-'}</strong></label><label>Revised With<strong>{budget.revisedBy?.name || '-'}</strong></label></div><div className="budget-detail-layout"><div className="budget-detail-table"><h2>Budget Lines</h2><table className="budget-table"><thead><tr><th>Analytic Account</th><th>Type</th><th>Committed Amount</th><th>Achieved Amount</th><th>Achieved %</th><th>Amount to Achieve</th></tr></thead><tbody>{budget.lines.map((line) => <tr key={line.id}><td>{line.analyticAccountName}</td><td><span className="budget-type">{line.type === 'INCOME' ? 'Income' : 'Expenses'}</span></td><td>{money(line.committedAmount)}</td><td><button className="budget-link-button" type="button" onClick={() => onActivity(line)}>{money(line.achievedAmount)}</button></td><td>{line.achievedPercentage.toFixed(1)}%</td><td>{money(line.amountToAchieve)}</td></tr>)}</tbody></table>{activity && <ActivityPanel activity={activity} />}</div><PieChart budget={budget} /></div></div>; }
function ActivityPanel({ activity }) { return <div className="budget-activity-panel"><div><h3>{activity.line.analyticAccountName} Achieved Amount</h3><span>{money(activity.line.achievedAmount)}</span></div>{activity.activity.length === 0 ? <p>No confirmed transactions in this budget period.</p> : activity.activity.map((item) => <div className="budget-activity-row" key={`${item.source}-${item.reference}`}><span>{item.reference}<small>{item.source} · {item.partner}</small></span><strong>{money(item.amount)}</strong></div>)}</div>; }
function StatusBadge({ status }) { return <span className={`budget-status budget-status--${status.toLowerCase()}`}>{status}</span>; }
function MiniPie({ budget }) { const achieved = budget.committedAmount ? Math.min((budget.achievedAmount / budget.committedAmount) * 100, 100) : 0; return <span className="budget-pie" style={{ '--pie-achieved': `${achieved}%` }} aria-label={`${achieved.toFixed(1)} percent achieved`}><span>{achieved.toFixed(0)}%</span></span>; }
function PieChart({ budget }) { return <div className="budget-chart-panel"><h2>Budget Achievement</h2><MiniPie budget={budget} /><div className="budget-chart-legend"><span><i className="legend-achieved" />Achieved Amount <strong>{money(budget.achievedAmount)}</strong></span><span><i className="legend-remaining" />Amount to Achieve <strong>{money(budget.amountToAchieve)}</strong></span></div></div>; }
