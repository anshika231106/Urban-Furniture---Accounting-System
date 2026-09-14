import { prisma } from '../lib/prisma.js';

function formatJournalEntry(entry) {
  return {
    id: entry.id,
    number: entry.number,
    accountingDate: entry.date ? new Date(entry.date).toISOString().split('T')[0] : '',
    journalId: entry.journalId,
    journalName: entry.journal?.name || '',
    status: entry.status === 'POSTED' ? 'Posted' : 'Draft',
    total: Number(entry.total || 0),
    sourceType: entry.sourceType || 'MANUAL',
    lines: (entry.lines || []).map((l) => ({
      id: l.id,
      accountId: l.accountId,
      accountName: l.account?.name || '',
      partnerId: l.partnerId || '',
      partnerName: l.partner?.name || '',
      debit: Number(l.debit || 0),
      credit: Number(l.credit || 0),
    })),
  };
}

/**
 * GET /api/journal-entries
 * List all journal entries from Prisma DB (optional query param: ?status=Draft|Posted)
 */
export async function getJournalEntries(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      where.status = status.toUpperCase() === 'POSTED' ? 'POSTED' : 'DRAFT';
    }

    const entries = await prisma.journalEntry.findMany({
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

    res.json(entries.map(formatJournalEntry));
  } catch (error) {
    console.error('Error fetching journal entries from DB:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries.' });
  }
}

/**
 * GET /api/journal-entries/:id
 * Get a single journal entry by ID from Prisma DB
 */
export async function getJournalEntryById(req, res) {
  try {
    const { id } = req.params;
    const entry = await prisma.journalEntry.findUnique({
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

    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    res.json(formatJournalEntry(entry));
  } catch (error) {
    console.error('Error fetching journal entry from DB:', error);
    res.status(500).json({ error: 'Failed to fetch journal entry.' });
  }
}

/**
 * POST /api/journal-entries
 * Create a new journal entry in Draft status in Prisma DB
 */
export async function createJournalEntry(req, res) {
  try {
    const { accountingDate, journalId, partnerId, lines } = req.body;

    if (!journalId) {
      return res.status(400).json({ error: 'Journal is required.' });
    }

    // Lookup journal by ID or name
    const targetJournal = await prisma.journal.findFirst({
      where: {
        OR: [{ id: journalId }, { name: journalId }],
      },
    });

    if (!targetJournal) {
      return res.status(400).json({ error: 'Invalid Journal selected.' });
    }

    if (!Array.isArray(lines) || lines.length < 2) {
      return res
        .status(400)
        .json({ error: 'Journal Entry must contain at least 2 lines.' });
    }

    let totalDebit = 0;
    let totalCredit = 0;
    const lineData = [];

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.accountId) {
        return res
          .status(400)
          .json({ error: `Line ${i + 1}: Account is required.` });
      }

      const acc = await prisma.account.findFirst({
        where: {
          OR: [{ id: l.accountId }, { name: l.accountId }],
        },
      });

      if (!acc) {
        return res
          .status(400)
          .json({ error: `Line ${i + 1}: Invalid Account selected.` });
      }

      const debitVal = Math.max(0, Number(l.debit) || 0);
      const creditVal = Math.max(0, Number(l.credit) || 0);
      totalDebit += debitVal;
      totalCredit += creditVal;

      let resolvedPartnerId = null;
      const pid = l.partnerId || partnerId;
      if (pid) {
        const partner = await prisma.contact.findFirst({
          where: {
            OR: [{ id: pid }, { name: pid }],
          },
        });
        if (partner) resolvedPartnerId = partner.id;
      }

      lineData.push({
        accountId: acc.id,
        partnerId: resolvedPartnerId,
        debit: debitVal,
        credit: creditVal,
      });
    }

    // Generate sequential entry number
    const count = await prisma.journalEntry.count();
    const year = new Date().getFullYear();
    const prefix = targetJournal.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'JRNL';
    const number = `${prefix}/${year}/${String(count + 1).padStart(4, '0')}`;
    const date = accountingDate ? new Date(accountingDate) : new Date();

    const created = await prisma.$transaction(async (tx) => {
      return tx.journalEntry.create({
        data: {
          number,
          journalId: targetJournal.id,
          date,
          status: 'DRAFT',
          total: totalDebit,
          sourceType: 'MANUAL',
          lines: {
            create: lineData,
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

    res.status(201).json(formatJournalEntry(created));
  } catch (error) {
    console.error('Error creating journal entry in DB:', error);
    res.status(500).json({ error: error.message || 'Failed to create journal entry in database.' });
  }
}

/**
 * PUT /api/journal-entries/:id
 * Update an existing Draft journal entry in Prisma DB
 */
export async function updateJournalEntry(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    if (existing.status === 'POSTED') {
      return res
        .status(400)
        .json({ error: 'Cannot edit an already posted journal entry.' });
    }

    const { accountingDate, journalId, partnerId, lines } = req.body;

    let targetJournalId = existing.journalId;
    if (journalId) {
      const j = await prisma.journal.findFirst({
        where: { OR: [{ id: journalId }, { name: journalId }] },
      });
      if (!j) return res.status(400).json({ error: 'Invalid Journal selected.' });
      targetJournalId = j.id;
    }

    let lineData = null;
    let totalDebit = existing.total;

    if (Array.isArray(lines)) {
      if (lines.length < 2) {
        return res
          .status(400)
          .json({ error: 'Journal Entry must contain at least 2 lines.' });
      }

      totalDebit = 0;
      lineData = [];

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!l.accountId) {
          return res
            .status(400)
            .json({ error: `Line ${i + 1}: Account is required.` });
        }

        const acc = await prisma.account.findFirst({
          where: { OR: [{ id: l.accountId }, { name: l.accountId }] },
        });
        if (!acc) {
          return res
            .status(400)
            .json({ error: `Line ${i + 1}: Invalid Account selected.` });
        }

        const debitVal = Math.max(0, Number(l.debit) || 0);
        const creditVal = Math.max(0, Number(l.credit) || 0);
        totalDebit += debitVal;

        let resolvedPartnerId = null;
        const pid = l.partnerId || partnerId;
        if (pid) {
          const partner = await prisma.contact.findFirst({
            where: { OR: [{ id: pid }, { name: pid }] },
          });
          if (partner) resolvedPartnerId = partner.id;
        }

        lineData.push({
          accountId: acc.id,
          partnerId: resolvedPartnerId,
          debit: debitVal,
          credit: creditVal,
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (lineData) {
        await tx.journalEntryLine.deleteMany({ where: { journalEntryId: id } });
      }

      return tx.journalEntry.update({
        where: { id },
        data: {
          journalId: targetJournalId,
          date: accountingDate ? new Date(accountingDate) : existing.date,
          total: totalDebit,
          ...(lineData ? { lines: { create: lineData } } : {}),
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

    res.json(formatJournalEntry(updated));
  } catch (error) {
    console.error('Error updating journal entry in DB:', error);
    res.status(500).json({ error: error.message || 'Failed to update journal entry in database.' });
  }
}

/**
 * POST /api/journal-entries/:id/post
 * Post a Draft journal entry with HARD BLOCKING validation (Debit == Credit)
 */
export async function postJournalEntry(req, res) {
  try {
    const { id } = req.params;
    const entry = await prisma.journalEntry.findUnique({
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

    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    if (entry.status === 'POSTED') {
      return res.json(formatJournalEntry(entry));
    }

    // Hard blocking check per Rule 6: Debit must equal Credit before entry can be Posted
    const totalDebit = entry.lines.reduce(
      (sum, l) => sum + (Number(l.debit) || 0),
      0
    );
    const totalCredit = entry.lines.reduce(
      (sum, l) => sum + (Number(l.credit) || 0),
      0
    );

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

    if (!isBalanced || entry.lines.length === 0) {
      return res.status(400).json({
        error: `Debit must equal Credit before entry can be Posted. (Total Debit: ${totalDebit.toFixed(
          2
        )}, Total Credit: ${totalCredit.toFixed(2)})`,
      });
    }

    const posted = await prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED' },
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

    res.json(formatJournalEntry(posted));
  } catch (error) {
    console.error('Error posting journal entry:', error);
    res.status(500).json({ error: error.message || 'Failed to post journal entry.' });
  }
}

/**
 * POST /api/journal-entries/:id/cancel
 * Cancel a journal entry
 */
export async function cancelJournalEntry(req, res) {
  try {
    const { id } = req.params;
    const entry = await prisma.journalEntry.findUnique({ where: { id } });

    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: { status: 'DRAFT' },
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

    res.json(formatJournalEntry(updated));
  } catch (error) {
    console.error('Error cancelling journal entry:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel journal entry.' });
  }
}
