import { prisma } from '../lib/prisma.js';
import { chartOfAccounts, journals, analyticAccounts } from '../data/store.js';
import { generateId } from '../utils/crypto.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map a Prisma Journal row (with defaultAccount relation) to the flat shape
 * the frontend expects: { id, name, type, defaultAccount }
 */
function formatJournal(j) {
  return {
    id: j.id,
    name: j.name,
    // Prisma stores JournalType enum in UPPER_CASE; frontend uses Title Case
    type: titleCase(j.type),
    defaultAccount: j.defaultAccount ? j.defaultAccount.name : '',
  };
}

function titleCase(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Map the frontend's Title-Case type string (e.g. "Sales") to the Prisma
 * JournalType enum value (e.g. "SALES").
 */
function toJournalTypeEnum(type) {
  return type ? type.toUpperCase() : null;
}

// ─── Chart of Accounts (still in-memory — migrated later) ─────────────────────

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

  // ─── Journals (Prisma / PostgreSQL) ────────────────────────────────────────────

  /**
   * GET /api/journals
   * Return all journals, with their default account name included.
   */
  export async function getJournals(req, res) {
    try {
      const rows = await prisma.journal.findMany({
        include: { defaultAccount: true },
        orderBy: { name: 'asc' },
      });
      res.json(rows.map(formatJournal));
    } catch (err) {
      console.error('[getJournals]', err);
      res.status(500).json({ error: 'Failed to fetch journals.' });
    }
  }

  /**
   * POST /api/journals
   * Create a new journal. defaultAccount is optional but recommended.
   */
  export async function createJournal(req, res) {
    const { name, type, defaultAccount } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Journal Name is required.' });
    const typeEnum = toJournalTypeEnum(type);
    if (!typeEnum) return res.status(400).json({ error: 'Journal Type is required.' });

    try {
      // Resolve the default account FK if a name was provided
      let defaultAccountId = null;
      if (defaultAccount) {
        const account = await prisma.account.findFirst({ where: { name: defaultAccount } });
        if (!account) {
          return res.status(400).json({ error: `Account "${defaultAccount}" not found in Chart of Accounts.` });
        }
        defaultAccountId = account.id;
      }

      // defaultAccountId is required by schema — if none selected, pick the first account
      if (!defaultAccountId) {
        const fallback = await prisma.account.findFirst();
        if (!fallback) return res.status(500).json({ error: 'No accounts exist yet. Please seed the Chart of Accounts first.' });
        defaultAccountId = fallback.id;
      }

      const created = await prisma.journal.create({
        data: { name: name.trim(), type: typeEnum, defaultAccountId },
        include: { defaultAccount: true },
      });

      res.status(201).json(formatJournal(created));
    } catch (err) {
      console.error('[createJournal]', err);
      res.status(500).json({ error: 'Failed to create journal.' });
    }
  }

  /**
   * PUT /api/journals/:id
   * Update an existing journal.
   */
  export async function updateJournal(req, res) {
    const { id } = req.params;
    const { name, type, defaultAccount } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Journal Name is required.' });
    const typeEnum = toJournalTypeEnum(type);
    if (!typeEnum) return res.status(400).json({ error: 'Journal Type is required.' });

    try {
      // Make sure journal exists
      const existing = await prisma.journal.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Journal not found.' });

      // Resolve default account
      let defaultAccountId = existing.defaultAccountId;
      if (defaultAccount) {
        const account = await prisma.account.findFirst({ where: { name: defaultAccount } });
        if (!account) {
          return res.status(400).json({ error: `Account "${defaultAccount}" not found in Chart of Accounts.` });
        }
        defaultAccountId = account.id;
      }

      const updated = await prisma.journal.update({
        where: { id },
        data: { name: name.trim(), type: typeEnum, defaultAccountId },
        include: { defaultAccount: true },
      });

      res.json(formatJournal(updated));
    } catch (err) {
      console.error('[updateJournal]', err);
      res.status(500).json({ error: 'Failed to update journal.' });
    }
  }

  // ─── Analytic Accounts (still in-memory — migrated later) ─────────────────────

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
