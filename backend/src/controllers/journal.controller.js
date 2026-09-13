import {
  journalEntries,
  journals,
  chartOfAccounts,
  contacts,
  getNextJournalEntryNumber,
} from '../data/store.js';
import { generateId } from '../utils/crypto.js';

/**
 * GET /api/journal-entries
 * List all journal entries (optional query param: ?status=Draft|Posted|Cancelled)
 */
export function getJournalEntries(req, res) {
  const { status } = req.query;
  if (status) {
    const filtered = journalEntries.filter(
      (j) => j.status.toLowerCase() === status.toLowerCase()
    );
    return res.json(filtered);
  }
  res.json(journalEntries);
}

/**
 * GET /api/journal-entries/:id
 * Get a single journal entry by ID
 */
export function getJournalEntryById(req, res) {
  const { id } = req.params;
  const entry = journalEntries.find((j) => j.id === id);
  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found.' });
  }
  res.json(entry);
}

/**
 * POST /api/journal-entries
 * Create a new journal entry in Draft status
 */
export function createJournalEntry(req, res) {
  const { accountingDate, journalId, partnerId, lines } = req.body;

  if (!journalId) {
    return res.status(400).json({ error: 'Journal is required.' });
  }

  const targetJournal = journals.find((j) => j.id === journalId);
  if (!targetJournal) {
    return res.status(400).json({ error: 'Invalid Journal selected.' });
  }

  if (!Array.isArray(lines) || lines.length < 2) {
    return res
      .status(400)
      .json({ error: 'Journal Entry must contain at least 2 lines.' });
  }

  const partnerObj = partnerId ? contacts.find((c) => c.id === partnerId) : null;

  // Process & validate line items
  const processedLines = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.accountId) {
      return res
        .status(400)
        .json({ error: `Line ${i + 1}: Account is required.` });
    }

    const coaAccount = chartOfAccounts.find((a) => a.id === l.accountId);
    if (!coaAccount) {
      return res
        .status(400)
        .json({ error: `Line ${i + 1}: Invalid Account selected.` });
    }

    const linePartner = l.partnerId
      ? contacts.find((c) => c.id === l.partnerId)
      : partnerObj;

    const debitVal = Math.max(0, Number(l.debit) || 0);
    const creditVal = Math.max(0, Number(l.credit) || 0);

    totalDebit += debitVal;
    totalCredit += creditVal;

    processedLines.push({
      id: `jel-${generateId()}`,
      accountId: coaAccount.id,
      accountName: coaAccount.name,
      partnerId: linePartner ? linePartner.id : '',
      partnerName: linePartner ? linePartner.name : '',
      debit: debitVal,
      credit: creditVal,
    });
  }

  const number = getNextJournalEntryNumber(targetJournal.name);
  const entryDate = accountingDate || new Date().toISOString().split('T')[0];

  const newEntry = {
    id: `je-${generateId()}`,
    number,
    accountingDate: entryDate,
    journalId: targetJournal.id,
    journalName: targetJournal.name,
    partnerId: partnerObj ? partnerObj.id : '',
    partnerName: partnerObj ? partnerObj.name : '',
    status: 'Draft',
    total: totalDebit,
    lines: processedLines,
    createdAt: new Date().toISOString(),
  };

  journalEntries.push(newEntry);
  res.status(201).json(newEntry);
}

/**
 * PUT /api/journal-entries/:id
 * Update an existing Draft journal entry
 */
export function updateJournalEntry(req, res) {
  const { id } = req.params;
  const entryIndex = journalEntries.findIndex((j) => j.id === id);

  if (entryIndex === -1) {
    return res.status(404).json({ error: 'Journal entry not found.' });
  }

  const existingEntry = journalEntries[entryIndex];
  if (existingEntry.status !== 'Draft') {
    return res
      .status(400)
      .json({ error: `Cannot edit entry in '${existingEntry.status}' state.` });
  }

  const { accountingDate, journalId, partnerId, lines } = req.body;

  let journalObj = existingEntry.journalId
    ? journals.find((j) => j.id === existingEntry.journalId)
    : null;

  if (journalId) {
    journalObj = journals.find((j) => j.id === journalId);
    if (!journalObj) {
      return res.status(400).json({ error: 'Invalid Journal selected.' });
    }
  }

  const partnerObj = partnerId
    ? contacts.find((c) => c.id === partnerId)
    : existingEntry.partnerId
    ? contacts.find((c) => c.id === existingEntry.partnerId)
    : null;

  let processedLines = existingEntry.lines;
  let totalDebit = existingEntry.total;

  if (Array.isArray(lines)) {
    if (lines.length < 2) {
      return res
        .status(400)
        .json({ error: 'Journal Entry must contain at least 2 lines.' });
    }

    processedLines = [];
    totalDebit = 0;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.accountId) {
        return res
          .status(400)
          .json({ error: `Line ${i + 1}: Account is required.` });
      }

      const coaAccount = chartOfAccounts.find((a) => a.id === l.accountId);
      if (!coaAccount) {
        return res
          .status(400)
          .json({ error: `Line ${i + 1}: Invalid Account selected.` });
      }

      const linePartner = l.partnerId
        ? contacts.find((c) => c.id === l.partnerId)
        : partnerObj;

      const debitVal = Math.max(0, Number(l.debit) || 0);
      const creditVal = Math.max(0, Number(l.credit) || 0);

      totalDebit += debitVal;

      processedLines.push({
        id: l.id || `jel-${generateId()}`,
        accountId: coaAccount.id,
        accountName: coaAccount.name,
        partnerId: linePartner ? linePartner.id : '',
        partnerName: linePartner ? linePartner.name : '',
        debit: debitVal,
        credit: creditVal,
      });
    }
  }

  const updatedEntry = {
    ...existingEntry,
    accountingDate: accountingDate || existingEntry.accountingDate,
    journalId: journalObj ? journalObj.id : existingEntry.journalId,
    journalName: journalObj ? journalObj.name : existingEntry.journalName,
    partnerId: partnerObj ? partnerObj.id : '',
    partnerName: partnerObj ? partnerObj.name : '',
    lines: processedLines,
    total: totalDebit,
  };

  journalEntries[entryIndex] = updatedEntry;
  res.json(updatedEntry);
}

/**
 * POST /api/journal-entries/:id/post
 * Post a Draft journal entry with HARD BLOCKING validation (Debit == Credit)
 */
export function postJournalEntry(req, res) {
  const { id } = req.params;
  const entry = journalEntries.find((j) => j.id === id);

  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found.' });
  }

  if (entry.status === 'Posted') {
    return res.json(entry);
  }

  if (entry.status === 'Cancelled') {
    return res
      .status(400)
      .json({ error: 'Cancelled journal entries cannot be posted.' });
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

  entry.status = 'Posted';
  entry.postedAt = new Date().toISOString();

  res.json(entry);
}

/**
 * POST /api/journal-entries/:id/cancel
 * Cancel a journal entry
 */
export function cancelJournalEntry(req, res) {
  const { id } = req.params;
  const entry = journalEntries.find((j) => j.id === id);

  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found.' });
  }

  entry.status = 'Cancelled';
  res.json(entry);
}
