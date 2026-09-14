import { prisma } from '../lib/prisma.js';
import {
  journalEntries,
  journals,
  chartOfAccounts,
  contacts,
  getNextJournalEntryNumber,
} from '../data/store.js';
import { generateId } from '../utils/crypto.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a JournalEntry row (Prisma or store) to the exact shape expected by frontend.
 */
function formatJournalEntry(je) {
  const lines = (je.lines || []).map((l) => ({
    id: l.id,
    accountId: l.accountId,
    accountName: l.account ? l.account.name : (l.accountName || ''),
    partnerId: l.partnerId || '',
    partnerName: l.partner ? l.partner.name : (l.partnerName || ''),
    debit: Number(l.debit || 0),
    credit: Number(l.credit || 0),
  }));

  const partnerNames = [
    ...new Set(lines.map((l) => l.partnerName).filter(Boolean)),
  ];
  const partnerDisplay = partnerNames.length > 0 ? partnerNames.join(', ') : (je.partnerName || '—');

  let formattedDate = '';
  if (je.date) {
    formattedDate = typeof je.date === 'string'
      ? je.date.split('T')[0]
      : new Date(je.date).toISOString().split('T')[0];
  } else if (je.accountingDate) {
    formattedDate = typeof je.accountingDate === 'string'
      ? je.accountingDate.split('T')[0]
      : new Date(je.accountingDate).toISOString().split('T')[0];
  } else {
    formattedDate = new Date().toISOString().split('T')[0];
  }

  const isPosted = (je.status || 'DRAFT').toUpperCase() === 'POSTED';

  return {
    id: je.id,
    number: je.number,
    date: formattedDate,
    accountingDate: formattedDate,
    journalId: je.journalId,
    journal: je.journal ? je.journal.name : (je.journalName || ''),
    journalName: je.journal ? je.journal.name : (je.journalName || ''),
    partner: partnerDisplay,
    partnerId: lines[0]?.partnerId || je.partnerId || '',
    partnerName: partnerDisplay,
    status: isPosted ? 'Posted' : 'Draft',
    total: Number(je.total || 0),
    lines,
    createdAt: je.createdAt ? new Date(je.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Generate sequential Journal Entry number (e.g. MISC/2026/0001 or BANK/2026/0001)
 */
async function generateEntryNumber(journalName = 'MISC') {
  const prefix = (journalName || 'MISC').substring(0, 4).toUpperCase();
  const year = new Date().getFullYear();
  const pattern = `${prefix}/${year}/`;

  try {
    const existing = await prisma.journalEntry.findMany({
      where: {
        number: {
          startsWith: pattern,
        },
      },
      orderBy: { number: 'desc' },
      take: 1,
    });

    let nextSeq = 1;
    if (existing && existing.length > 0) {
      const parts = existing[0].number.split('/');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    return `${prefix}/${year}/${String(nextSeq).padStart(4, '0')}`;
  } catch (e) {
    return getNextJournalEntryNumber(journalName);
  }
}

// ─── Controller Handlers ──────────────────────────────────────────────────────

/**
 * GET /api/journal-entries
 * List all journal entries (optional query param: ?status=Draft|Posted)
 */
export async function getJournalEntries(req, res) {
  const { status } = req.query;

  try {
    const where = {};
    if (status) {
      where.status = status.toUpperCase() === 'POSTED' ? 'POSTED' : 'DRAFT';
    }

    const rows = await prisma.journalEntry.findMany({
      where,
      include: {
        journal: true,
        lines: {
          include: {
            account: true,
            partner: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(rows.map(formatJournalEntry));
  } catch (error) {
    console.error('[getJournalEntries DB Error, falling back to store]:', error.message);
    let result = journalEntries;
    if (status) {
      result = result.filter((j) => j.status.toLowerCase() === status.toLowerCase());
    }
    res.json(result.map(formatJournalEntry));
  }
}

/**
 * GET /api/journal-entries/:id
 * Get a single journal entry by ID
 */
export async function getJournalEntryById(req, res) {
  const { id } = req.params;

  try {
    const row = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journal: true,
        lines: {
          include: {
            account: true,
            partner: true,
          },
        },
      },
    });

    if (row) {
      return res.json(formatJournalEntry(row));
    }
  } catch (error) {
    console.error('[getJournalEntryById DB Error]:', error.message);
  }

  // Fallback to store
  const entry = journalEntries.find((j) => j.id === id);
  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found.' });
  }
  res.json(formatJournalEntry(entry));
}

/**
 * POST /api/journal-entries
 * Create a new journal entry in Draft or Posted status.
 * Enforces MVP.md §4.5 Hard Blocking Rule on Post: Debit must equal Credit.
 */
export async function createJournalEntry(req, res) {
  const { accountingDate, date, journalId, lines, status } = req.body;

  if (!journalId) {
    return res.status(400).json({ error: 'Journal is required.' });
  }

  if (!Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ error: 'Journal Entry must contain at least 2 lines.' });
  }

  // Calculate totals and validate lines
  let totalDebit = 0;
  let totalCredit = 0;
  const lineInputs = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.accountId) {
      return res.status(400).json({ error: `Line ${i + 1}: Account is required.` });
    }

    const debitVal = Math.max(0, Number(l.debit) || 0);
    const creditVal = Math.max(0, Number(l.credit) || 0);

    totalDebit += debitVal;
    totalCredit += creditVal;

    lineInputs.push({
      accountId: l.accountId,
      partnerId: l.partnerId || null,
      debit: debitVal,
      credit: creditVal,
    });
  }

  const isPosting = status && (status.toLowerCase() === 'posted' || status.toUpperCase() === 'POSTED');

  // Hard blocking rule: On Post, total Debit must equal total Credit
  if (isPosting) {
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;
    if (!isBalanced || totalDebit <= 0) {
      return res.status(400).json({
        error: `Debit must equal Credit before posting. (Total Debit: ₹${totalDebit.toFixed(2)}, Total Credit: ₹${totalCredit.toFixed(2)})`,
      });
    }
  }

  const entryDate = new Date(accountingDate || date || new Date().toISOString().split('T')[0]);

  try {
    // Resolve journal
    const journalRecord = await prisma.journal.findUnique({ where: { id: journalId } });
    if (!journalRecord) {
      return res.status(400).json({ error: 'Selected Journal not found.' });
    }

    const number = await generateEntryNumber(journalRecord.name);

    // Create entry + lines atomically in a database transaction
    const created = await prisma.$transaction(async (tx) => {
      return tx.journalEntry.create({
        data: {
          journalId: journalRecord.id,
          date: entryDate,
          number,
          total: totalDebit,
          status: isPosting ? 'POSTED' : 'DRAFT',
          sourceType: 'MANUAL',
          lines: {
            create: lineInputs.map((l) => ({
              accountId: l.accountId,
              partnerId: l.partnerId,
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
        include: {
          journal: true,
          lines: {
            include: {
              account: true,
              partner: true,
            },
          },
        },
      });
    });

    const formatted = formatJournalEntry(created);
    // Sync store as well
    journalEntries.push(formatted);

    return res.status(201).json(formatted);
  } catch (error) {
    console.error('[createJournalEntry DB Error, falling back to store]:', error);

    // Fallback in-memory
    const journalObj = journals.find((j) => j.id === journalId) || { id: journalId, name: 'General' };
    const number = getNextJournalEntryNumber(journalObj.name);

    const storeLines = lineInputs.map((l) => {
      const coa = chartOfAccounts.find((a) => a.id === l.accountId);
      const contact = contacts.find((c) => c.id === l.partnerId);
      return {
        id: `jel-${generateId()}`,
        accountId: l.accountId,
        accountName: coa ? coa.name : 'Account',
        partnerId: l.partnerId || '',
        partnerName: contact ? contact.name : '',
        debit: l.debit,
        credit: l.credit,
      };
    });

    const newStoreEntry = {
      id: `je-${generateId()}`,
      number,
      accountingDate: entryDate.toISOString().split('T')[0],
      date: entryDate.toISOString().split('T')[0],
      journalId: journalObj.id,
      journalName: journalObj.name,
      journal: journalObj.name,
      status: isPosting ? 'Posted' : 'Draft',
      total: totalDebit,
      lines: storeLines,
      createdAt: new Date().toISOString(),
    };

    journalEntries.push(newStoreEntry);
    res.status(201).json(formatJournalEntry(newStoreEntry));
  }
}

/**
 * PUT /api/journal-entries/:id
 * Update an existing Draft journal entry.
 */
export async function updateJournalEntry(req, res) {
  const { id } = req.params;
  const { accountingDate, date, journalId, lines } = req.body;

  if (!Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ error: 'Journal Entry must contain at least 2 lines.' });
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const lineInputs = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.accountId) {
      return res.status(400).json({ error: `Line ${i + 1}: Account is required.` });
    }

    const debitVal = Math.max(0, Number(l.debit) || 0);
    const creditVal = Math.max(0, Number(l.credit) || 0);

    totalDebit += debitVal;
    totalCredit += creditVal;

    lineInputs.push({
      accountId: l.accountId,
      partnerId: l.partnerId || null,
      debit: debitVal,
      credit: creditVal,
    });
  }

  const entryDate = new Date(accountingDate || date || new Date().toISOString().split('T')[0]);

  try {
    const existing = await prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    if (existing.status === 'POSTED') {
      return res.status(400).json({ error: 'Cannot edit a Posted journal entry.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing lines
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: id },
      });

      // Update header and re-create lines
      return tx.journalEntry.update({
        where: { id },
        data: {
          journalId: journalId || existing.journalId,
          date: entryDate,
          total: totalDebit,
          lines: {
            create: lineInputs.map((l) => ({
              accountId: l.accountId,
              partnerId: l.partnerId,
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
        include: {
          journal: true,
          lines: {
            include: {
              account: true,
              partner: true,
            },
          },
        },
      });
    });

    const formatted = formatJournalEntry(updated);
    const storeIdx = journalEntries.findIndex((j) => j.id === id);
    if (storeIdx !== -1) {
      journalEntries[storeIdx] = formatted;
    }

    return res.json(formatted);
  } catch (error) {
    console.error('[updateJournalEntry DB Error, falling back to store]:', error);

    const storeIdx = journalEntries.findIndex((j) => j.id === id);
    if (storeIdx === -1) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    if (journalEntries[storeIdx].status === 'Posted') {
      return res.status(400).json({ error: 'Cannot edit a Posted journal entry.' });
    }

    const journalObj = journalId
      ? journals.find((j) => j.id === journalId) || { id: journalId, name: 'General' }
      : { id: journalEntries[storeIdx].journalId, name: journalEntries[storeIdx].journalName };

    const storeLines = lineInputs.map((l) => {
      const coa = chartOfAccounts.find((a) => a.id === l.accountId);
      const contact = contacts.find((c) => c.id === l.partnerId);
      return {
        id: `jel-${generateId()}`,
        accountId: l.accountId,
        accountName: coa ? coa.name : 'Account',
        partnerId: l.partnerId || '',
        partnerName: contact ? contact.name : '',
        debit: l.debit,
        credit: l.credit,
      };
    });

    journalEntries[storeIdx] = {
      ...journalEntries[storeIdx],
      date: entryDate.toISOString().split('T')[0],
      accountingDate: entryDate.toISOString().split('T')[0],
      journalId: journalObj.id,
      journalName: journalObj.name,
      journal: journalObj.name,
      total: totalDebit,
      lines: storeLines,
    };

    res.json(formatJournalEntry(journalEntries[storeIdx]));
  }
}

/**
 * POST /api/journal-entries/:id/post
 * Post a Draft journal entry with HARD BLOCKING validation (Debit == Credit).
 */
export async function postJournalEntry(req, res) {
  const { id } = req.params;

  try {
    const existing = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journal: true,
        lines: {
          include: {
            account: true,
            partner: true,
          },
        },
      },
    });

    // Not in the DB — check the in-memory fallback store before giving up.
    if (!existing) {
      return postFromStore(id, res);
    }

    if (existing.status === 'POSTED') {
      return res.json(formatJournalEntry(existing));
    }

    const totalDebit = existing.lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
    const totalCredit = existing.lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

    if (!isBalanced || existing.lines.length === 0 || totalDebit <= 0) {
      return res.status(400).json({
        error: `Debit must equal Credit before entry can be Posted. (Total Debit: ₹${totalDebit.toFixed(2)}, Total Credit: ₹${totalCredit.toFixed(2)})`,
      });
    }

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: {
        status: 'POSTED',
        total: totalDebit,
      },
      include: {
        journal: true,
        lines: {
          include: {
            account: true,
            partner: true,
          },
        },
      },
    });

    const formatted = formatJournalEntry(updated);
    const storeIdx = journalEntries.findIndex((j) => j.id === id);
    if (storeIdx !== -1) {
      journalEntries[storeIdx] = formatted;
    }

    return res.json(formatted);
  } catch (error) {
    console.error('[postJournalEntry DB Error, falling back to store]:', error);
    return postFromStore(id, res);
  }
}

// Shared in-memory fallback logic, used both when Prisma finds nothing
// and when Prisma throws (e.g. DB connection error).
function postFromStore(id, res) {
  const entry = journalEntries.find((j) => j.id === id);
  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found.' });
  }

  if (entry.status === 'Posted') {
    return res.json(formatJournalEntry(entry));
  }

  const totalDebit = entry.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  if (!isBalanced || entry.lines.length === 0 || totalDebit <= 0) {
    return res.status(400).json({
      error: `Debit must equal Credit before entry can be Posted. (Total Debit: ₹${totalDebit.toFixed(2)}, Total Credit: ₹${totalCredit.toFixed(2)})`,
    });
  }

  entry.status = 'Posted';
  return res.json(formatJournalEntry(entry));
}
/**
 * POST /api/journal-entries/:id/cancel
 * Cancel a journal entry
 */
export async function cancelJournalEntry(req, res) {
  const { id } = req.params;

  try {
    const existing = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journal: true,
        lines: {
          include: { account: true, partner: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    // Update status back to DRAFT or handle cancellation
    const updated = await prisma.journalEntry.update({
      where: { id },
      data: { status: 'DRAFT' },
      include: {
        journal: true,
        lines: { include: { account: true, partner: true } },
      },
    });

    return res.json(formatJournalEntry(updated));
  } catch (error) {
    const entry = journalEntries.find((j) => j.id === id);
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }
    entry.status = 'Draft';
    res.json(formatJournalEntry(entry));
  }
}
