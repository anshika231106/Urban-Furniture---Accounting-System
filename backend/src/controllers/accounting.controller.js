import { chartOfAccounts, journals, analyticAccounts } from '../data/store.js';
import { generateId } from '../utils/crypto.js';

// Valid account types per MVP.md §4.3 — must match frontend dropdown values exactly
const VALID_ACCOUNT_TYPES = [
  'Asset', 'Liability', 'Bank', 'Capital', 'Cash',  // Balance Sheet
  'Income', 'Expenses', 'Other Expenses',            // Profit & Loss
];

// Chart of Accounts
export function getChartOfAccounts(req, res) {
  const includeArchived = req.query.includeArchived === 'true';
  const result = includeArchived
    ? chartOfAccounts
    : chartOfAccounts.filter((a) => !a.archived);
  res.json(result);
}

export function createChartOfAccount(req, res) {
  const { name, type } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Account Name is required.' });
  if (!type) return res.status(400).json({ error: 'Account Type is required.' });
  if (!VALID_ACCOUNT_TYPES.includes(type))
    return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}.` });

  const newAccount = { id: `coa-${generateId()}`, name: name.trim(), type, archived: false, system: false };
  chartOfAccounts.push(newAccount);
  res.status(201).json(newAccount);
}

export function updateChartOfAccount(req, res) {
  const { id } = req.params;
  const { name, type } = req.body;
  const account = chartOfAccounts.find((a) => a.id === id);
  if (!account) return res.status(404).json({ error: 'Account not found.' });

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Account Name cannot be empty.' });
    account.name = name.trim();
  }
  if (type !== undefined) {
    if (!VALID_ACCOUNT_TYPES.includes(type))
      return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}.` });
    account.type = type;
  }
  res.json(account);
}

export function archiveChartOfAccount(req, res) {
  const { id } = req.params;
  const account = chartOfAccounts.find((a) => a.id === id);
  if (!account) return res.status(404).json({ error: 'Account not found.' });
  if (account.system)
    return res.status(403).json({ error: 'System accounts cannot be archived. They are required by the accounting engine.' });

  account.archived = true;
  res.json({ message: 'Account archived.', account });
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
