import { chartOfAccounts, journals, analyticAccounts } from '../data/store.js';
import { generateId } from '../utils/crypto.js';

// Chart of Accounts
export function getChartOfAccounts(req, res) {
  res.json(chartOfAccounts);
}

export function createChartOfAccount(req, res) {
  const { name, type } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Account Name is required.' });
  if (!type) return res.status(400).json({ error: 'Account Type is required.' });

  const newAccount = { id: `coa-${generateId()}`, name: name.trim(), type };
  chartOfAccounts.push(newAccount);
  res.status(201).json(newAccount);
}

// Journals
export function getJournals(req, res) {
  res.json(journals);
}

export function createJournal(req, res) {
  const { name, type, defaultAccount } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Journal Name is required.' });
  if (!type) return res.status(400).json({ error: 'Journal Type is required.' });

  const newJournal = { id: `j-${generateId()}`, name: name.trim(), type, defaultAccount: defaultAccount || '' };
  journals.push(newJournal);
  res.status(201).json(newJournal);
}

// Analytic Accounts
export function getAnalyticAccounts(req, res) {
  res.json(analyticAccounts);
}

export function createAnalyticAccount(req, res) {
  const { name, type } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Analytic Account Name is required.' });
  if (!type) return res.status(400).json({ error: 'Type (Income/Expenses) is required.' });

  const newAnalytic = { id: `an-${generateId()}`, name: name.trim(), type };
  analyticAccounts.push(newAnalytic);
  res.status(201).json(newAnalytic);
}
