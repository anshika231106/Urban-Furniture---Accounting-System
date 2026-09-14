import { prisma } from '../lib/prisma.js';
import { chartOfAccounts, journals, analyticAccounts } from '../data/store.js';
import { generateId } from '../utils/crypto.js';

// Valid account types per MVP.md §4.3 — must match frontend dropdown values exactly
const VALID_ACCOUNT_TYPES = [
  'Asset', 'Liability', 'Bank', 'Capital', 'Cash',  // Balance Sheet
  'Income', 'Expenses', 'Other Expenses',            // Profit & Loss
];

const SYSTEM_ACCOUNT_NAMES = [
  'Bank A/c', 'Cash A/c', 'Debtors A/c', 'Creditors A/c',
  'Sales Income A/c', 'Purchase Expense A/c', 'Other Expense A/c', 'Capital A/c'
];

function toPrismaAccountType(type) {
  switch (type) {
    case 'Asset':
    case 'Bank':
    case 'Cash':
      return 'ASSET';
    case 'Liability':
      return 'LIABILITY';
    case 'Income':
      return 'INCOME';
    case 'Expenses':
    case 'Expense':
      return 'EXPENSE';
    case 'Other Expenses':
    case 'Other Expense':
      return 'OTHER_EXPENSE';
    case 'Capital':
      return 'CAPITAL';
    default:
      return 'ASSET';
  }
}

function fromPrismaAccountType(dbType, accountName = '') {
  switch (dbType) {
    case 'ASSET':
      if (accountName.toLowerCase().includes('bank')) return 'Bank';
      if (accountName.toLowerCase().includes('cash')) return 'Cash';
      return 'Asset';
    case 'LIABILITY':
      return 'Liability';
    case 'INCOME':
      return 'Income';
    case 'EXPENSE':
      return 'Expenses';
    case 'OTHER_EXPENSE':
      return 'Other Expenses';
    case 'CAPITAL':
      return 'Capital';
    default:
      return dbType;
  }
}

// ── Chart of Accounts (Prisma Postgres DB) ──────────────────────────────────

export async function getChartOfAccounts(req, res) {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const accounts = await prisma.account.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: { name: 'asc' },
    });

    const result = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: fromPrismaAccountType(a.type, a.name),
      archived: a.archived,
      system: SYSTEM_ACCOUNT_NAMES.includes(a.name),
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching Chart of Accounts from DB:', error);
    // Fallback to store if DB connection fails
    const includeArchived = req.query.includeArchived === 'true';
    const fallback = includeArchived
      ? chartOfAccounts
      : chartOfAccounts.filter((a) => !a.archived);
    res.json(fallback);
  }
}

export async function createChartOfAccount(req, res) {
  try {
    const { name, type } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Account Name is required.' });
    if (!type) return res.status(400).json({ error: 'Account Type is required.' });
    if (!VALID_ACCOUNT_TYPES.includes(type))
      return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}.` });

    const prismaType = toPrismaAccountType(type);
    const created = await prisma.account.create({
      data: {
        name: name.trim(),
        type: prismaType,
        archived: false,
      },
    });

    const newAccount = {
      id: created.id,
      name: created.name,
      type: type,
      archived: created.archived,
      system: false,
    };

    // Sync in-memory store
    chartOfAccounts.push(newAccount);

    res.status(201).json(newAccount);
  } catch (error) {
    console.error('Error creating Chart of Account in DB:', error);
    res.status(500).json({ error: error.message || 'Failed to create account in database.' });
  }
}

export async function updateChartOfAccount(req, res) {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      // Check in-memory store as fallback
      const storeAcc = chartOfAccounts.find((a) => a.id === id);
      if (!storeAcc) return res.status(404).json({ error: 'Account not found.' });
      if (name !== undefined) storeAcc.name = name.trim();
      if (type !== undefined) storeAcc.type = type;
      return res.json(storeAcc);
    }

    const dataToUpdate = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Account Name cannot be empty.' });
      dataToUpdate.name = name.trim();
    }
    if (type !== undefined) {
      if (!VALID_ACCOUNT_TYPES.includes(type))
        return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}.` });
      dataToUpdate.type = toPrismaAccountType(type);
    }

    const updated = await prisma.account.update({
      where: { id },
      data: dataToUpdate,
    });

    const result = {
      id: updated.id,
      name: updated.name,
      type: type || fromPrismaAccountType(updated.type, updated.name),
      archived: updated.archived,
      system: SYSTEM_ACCOUNT_NAMES.includes(updated.name),
    };

    // Sync in-memory store
    const storeIdx = chartOfAccounts.findIndex((a) => a.id === id);
    if (storeIdx !== -1) {
      chartOfAccounts[storeIdx] = { ...chartOfAccounts[storeIdx], ...result };
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating Chart of Account in DB:', error);
    res.status(500).json({ error: error.message || 'Failed to update account in database.' });
  }
}

export async function archiveChartOfAccount(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (SYSTEM_ACCOUNT_NAMES.includes(existing.name)) {
      return res.status(403).json({
        error: 'System accounts cannot be archived. They are required by the accounting engine.',
      });
    }

    const archived = await prisma.account.update({
      where: { id },
      data: { archived: true },
    });

    const result = {
      id: archived.id,
      name: archived.name,
      type: fromPrismaAccountType(archived.type, archived.name),
      archived: true,
      system: false,
    };

    // Sync in-memory store
    const storeIdx = chartOfAccounts.findIndex((a) => a.id === id);
    if (storeIdx !== -1) {
      chartOfAccounts[storeIdx].archived = true;
    }

    res.json({ message: 'Account archived.', account: result });
  } catch (error) {
    console.error('Error archiving Chart of Account in DB:', error);
    res.status(500).json({ error: error.message || 'Failed to archive account in database.' });
  }
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
