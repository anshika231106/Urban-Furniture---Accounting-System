import { prisma } from '../data/prisma.js';

function toNumber(value) { return Number(value || 0); }
function toDateStart(value) { return value ? new Date(`${value}T00:00:00.000Z`) : undefined; }
function toDateEnd(value) { return value ? new Date(`${value}T23:59:59.999Z`) : undefined; }
function normalizeStatus(value) { return value ? String(value).toUpperCase() : undefined; }

function validateBudgetInput(body) {
  const { name, startDate, endDate, responsibleId, lines } = body;
  if (!name?.trim()) return 'Budget Name is required.';
  if (!startDate || !endDate) return 'Start Date and End Date are required.';
  if (new Date(startDate) > new Date(endDate)) return 'End Date must be on or after Start Date.';
  if (!responsibleId) return 'Responsible is required.';
  if (!Array.isArray(lines) || lines.length === 0) return 'At least one budget line is required.';
  for (const [index, line] of lines.entries()) {
    if (!line.analyticAccountId) return `Line ${index + 1}: Analytic Account is required.`;
    if (!['INCOME', 'EXPENSE'].includes(String(line.type).toUpperCase())) return `Line ${index + 1}: Type must be Income or Expense.`;
    if (Number(line.committedAmount) < 0 || line.committedAmount === '') return `Line ${index + 1}: Committed Amount must be zero or greater.`;
  }
  return null;
}

function serializeLine(line, achievedAmount = 0) {
  const committedAmount = toNumber(line.committedAmount);
  return { id: line.id, analyticAccountId: line.analyticAccountId, analyticAccountName: line.analyticAccount.name, type: line.type, committedAmount, achievedAmount, achievedPercentage: committedAmount > 0 ? (achievedAmount / committedAmount) * 100 : 0, amountToAchieve: committedAmount - achievedAmount };
}

async function getAchievedAmounts(budget) {
  const startDate = toDateStart(budget.startDate.toISOString().slice(0, 10));
  const endDate = toDateEnd(budget.endDate.toISOString().slice(0, 10));
  const analyticAccountIds = budget.lines.map((line) => line.analyticAccountId);
  const [invoiceLines, billLines] = await Promise.all([
    prisma.customerInvoiceLine.findMany({ where: { analyticAccountId: { in: analyticAccountIds }, customerInvoice: { status: 'CONFIRMED', invoiceDate: { gte: startDate, lte: endDate } } }, select: { id: true, analyticAccountId: true, total: true, customerInvoice: { select: { invoiceNumber: true, invoiceDate: true, customer: { select: { name: true } } } } } }),
    prisma.vendorBillLine.findMany({ where: { analyticAccountId: { in: analyticAccountIds }, vendorBill: { status: 'CONFIRMED', billDate: { gte: startDate, lte: endDate } } }, select: { id: true, analyticAccountId: true, total: true, vendorBill: { select: { billNumber: true, billDate: true, vendor: { select: { name: true } } } } } }),
  ]);
  const income = new Map();
  const expense = new Map();
  for (const line of invoiceLines) income.set(line.analyticAccountId, (income.get(line.analyticAccountId) || 0) + toNumber(line.total));
  for (const line of billLines) expense.set(line.analyticAccountId, (expense.get(line.analyticAccountId) || 0) + toNumber(line.total));
  return { invoiceLines, billLines, get: (line) => line.type === 'INCOME' ? income.get(line.analyticAccountId) || 0 : expense.get(line.analyticAccountId) || 0 };
}

function budgetInclude() {
  return { responsible: { select: { id: true, name: true } }, revisionOf: { select: { id: true, name: true } }, revisedBy: { select: { id: true, name: true } }, lines: { include: { analyticAccount: { select: { id: true, name: true } } }, orderBy: { id: 'asc' } } };
}

async function loadBudget(id) { return prisma.budget.findUnique({ where: { id }, include: budgetInclude() }); }

async function serializeBudget(budget, includeActuals = true) {
  const actuals = includeActuals ? await getAchievedAmounts(budget) : null;
  const lines = budget.lines.map((line) => serializeLine(line, actuals?.get(line) || 0));
  const committedAmount = lines.reduce((sum, line) => sum + line.committedAmount, 0);
  const achievedAmount = lines.reduce((sum, line) => sum + line.achievedAmount, 0);
  return { id: budget.id, name: budget.name, startDate: budget.startDate, endDate: budget.endDate, responsibleId: budget.responsibleId, responsible: budget.responsible, status: budget.status, revisionOfId: budget.revisionOfId, revisionOf: budget.revisionOf, revisedBy: budget.revisedBy, lines, committedAmount, achievedAmount, achievedPercentage: committedAmount > 0 ? (achievedAmount / committedAmount) * 100 : 0, amountToAchieve: committedAmount - achievedAmount };
}

export async function getBudgetOptions(req, res) {
  const [responsible, analyticAccounts] = await Promise.all([
    prisma.contact.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.analyticAccount.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, type: true } }),
  ]);
  res.json({ responsible, analyticAccounts });
}

export async function getBudgets(req, res) {
  const status = normalizeStatus(req.query.status);
  const budgets = await prisma.budget.findMany({ where: status ? { status } : {}, orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }], include: budgetInclude() });
  res.json({ budgets: await Promise.all(budgets.map((budget) => serializeBudget(budget))) });
}

export async function getBudgetById(req, res) {
  const budget = await loadBudget(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Budget not found.' });
  res.json(await serializeBudget(budget));
}

export async function createBudget(req, res) {
  const error = validateBudgetInput(req.body);
  if (error) return res.status(400).json({ error });
  const { name, startDate, endDate, responsibleId, lines } = req.body;
  const budget = await prisma.budget.create({ data: { name: name.trim(), startDate: new Date(startDate), endDate: new Date(endDate), responsibleId, status: 'DRAFT', lines: { create: lines.map((line) => ({ analyticAccountId: line.analyticAccountId, type: String(line.type).toUpperCase(), committedAmount: Number(line.committedAmount) })) } } });
  res.status(201).json(await serializeBudget(await loadBudget(budget.id), false));
}

export async function updateBudget(req, res) {
  const budget = await loadBudget(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Budget not found.' });
  if (budget.status !== 'DRAFT') return res.status(400).json({ error: 'Only Draft budgets can be edited.' });
  const error = validateBudgetInput(req.body);
  if (error) return res.status(400).json({ error });
  const { name, startDate, endDate, responsibleId, lines } = req.body;
  await prisma.$transaction([prisma.budgetLine.deleteMany({ where: { budgetId: budget.id } }), prisma.budget.update({ where: { id: budget.id }, data: { name: name.trim(), startDate: new Date(startDate), endDate: new Date(endDate), responsibleId, lines: { create: lines.map((line) => ({ analyticAccountId: line.analyticAccountId, type: String(line.type).toUpperCase(), committedAmount: Number(line.committedAmount) })) } } })]);
  res.json(await serializeBudget(await loadBudget(budget.id), false));
}

export async function confirmBudget(req, res) {
  const budget = await loadBudget(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Budget not found.' });
  if (budget.status === 'CONFIRMED') return res.json(await serializeBudget(budget));
  if (budget.status !== 'DRAFT') return res.status(400).json({ error: 'Only Draft budgets can be confirmed.' });
  await prisma.budget.update({ where: { id: budget.id }, data: { status: 'CONFIRMED' } });
  res.json(await serializeBudget(await loadBudget(budget.id)));
}

export async function cancelBudget(req, res) {
  const budget = await loadBudget(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Budget not found.' });
  if (budget.status === 'CANCELLED') return res.json(await serializeBudget(budget));
  if (budget.status === 'REVISED') return res.status(400).json({ error: 'Revised budgets cannot be cancelled.' });
  await prisma.budget.update({ where: { id: budget.id }, data: { status: 'CANCELLED' } });
  res.json(await serializeBudget(await loadBudget(budget.id)));
}

export async function reviseBudget(req, res) {
  const original = await loadBudget(req.params.id);
  if (!original) return res.status(404).json({ error: 'Budget not found.' });
  if (original.status !== 'CONFIRMED') return res.status(400).json({ error: 'Only Confirmed budgets can be revised.' });
  if (original.revisedBy) return res.status(400).json({ error: 'This budget has already been revised.' });
  const lines = Array.isArray(req.body.lines) ? req.body.lines : original.lines.map((line) => ({ analyticAccountId: line.analyticAccountId, type: line.type, committedAmount: line.committedAmount }));
  const revision = await prisma.$transaction(async (transaction) => {
    const created = await transaction.budget.create({ data: { name: `${original.name} Revised`, startDate: req.body.startDate ? new Date(req.body.startDate) : original.startDate, endDate: req.body.endDate ? new Date(req.body.endDate) : original.endDate, responsibleId: req.body.responsibleId || original.responsibleId, status: 'DRAFT', revisionOfId: original.id, lines: { create: lines.map((line) => ({ analyticAccountId: line.analyticAccountId, type: String(line.type).toUpperCase(), committedAmount: Number(line.committedAmount) })) } } });
    await transaction.budget.update({ where: { id: original.id }, data: { status: 'REVISED' } });
    return created;
  });
  res.status(201).json(await serializeBudget(await loadBudget(revision.id), false));
}

export async function getBudgetLineActivity(req, res) {
  const budget = await loadBudget(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Budget not found.' });
  const line = budget.lines.find((item) => item.id === req.params.lineId);
  if (!line) return res.status(404).json({ error: 'Budget line not found.' });
  const actuals = await getAchievedAmounts(budget);
  const activity = line.type === 'INCOME' ? actuals.invoiceLines.filter((item) => item.analyticAccountId === line.analyticAccountId).map((item) => ({ reference: item.customerInvoice.invoiceNumber, date: item.customerInvoice.invoiceDate, partner: item.customerInvoice.customer.name, amount: toNumber(item.total), source: 'Sales Invoice' })) : actuals.billLines.filter((item) => item.analyticAccountId === line.analyticAccountId).map((item) => ({ reference: item.vendorBill.billNumber, date: item.vendorBill.billDate, partner: item.vendorBill.vendor.name, amount: toNumber(item.total), source: 'Vendor Bill' }));
  res.json({ line: serializeLine(line, actuals.get(line)), activity });
}

export async function getBudgetReport(req, res) {
  const status = normalizeStatus(req.query.status);
  const budgets = await prisma.budget.findMany({ where: status ? { status } : {}, orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }], include: budgetInclude() });
  const reportBudgets = await Promise.all(budgets.map((budget) => serializeBudget(budget)));
  const summary = reportBudgets.reduce((totals, budget) => ({ committedAmount: totals.committedAmount + budget.committedAmount, achievedAmount: totals.achievedAmount + budget.achievedAmount, amountToAchieve: totals.amountToAchieve + budget.amountToAchieve }), { committedAmount: 0, achievedAmount: 0, amountToAchieve: 0 });
  res.json({ generatedAt: new Date().toISOString(), summary: { ...summary, achievedPercentage: summary.committedAmount > 0 ? (summary.achievedAmount / summary.committedAmount) * 100 : 0 }, budgets: reportBudgets });
}
