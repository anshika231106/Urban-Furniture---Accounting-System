import { vendorBills, customerInvoices, journalEntries, getNextJournalEntryNumber } from '../data/store.js';
import { generateId } from '../utils/crypto.js';

export function getPortalDocs(req, res) {
  const { contactId } = req.user;
  if (!contactId) {
    return res.status(403).json({ error: 'User is not linked to a contact.' });
  }

  // Find bills for this vendor
  const bills = vendorBills.filter((b) => b.vendorId === contactId);
  // Find invoices for this customer
  const invoices = customerInvoices.filter((i) => i.customerId === contactId);

  res.json({
    bills,
    invoices,
  });
}

export function payPortalDoc(req, res) {
  const { id } = req.params;
  const { contactId } = req.user;

  // Search in bills
  let doc = vendorBills.find((b) => b.id === id && b.vendorId === contactId);
  let isBill = true;

  if (!doc) {
    // Search in invoices
    doc = customerInvoices.find((i) => i.id === id && i.customerId === contactId);
    isBill = false;
  }

  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  if (doc.status === 'Paid') {
    return res.status(400).json({ error: 'Document is already paid.' });
  }

  // Backend logic: Generate a Journal Entry for the payment (MVP §8)
  const amountPaid = doc.amountDue;
  doc.status = 'Paid';
  doc.amountDue = 0;

  const je = {
    id: `je-${generateId()}`,
    number: getNextJournalEntryNumber('BANK'),
    accountingDate: new Date().toISOString().split('T')[0],
    journalId: 'j-3', // Bank journal
    journalName: 'Bank',
    partnerId: contactId,
    partnerName: isBill ? doc.vendorName : doc.customerName,
    status: 'Posted',
    total: amountPaid,
    lines: [],
    createdAt: new Date().toISOString(),
  };

  if (isBill) {
    // Bill Payment: Debit Creditors (coa-4), Credit Bank (coa-1)
    je.lines.push({
      id: `jel-${generateId()}`, accountId: 'coa-4', accountName: 'Creditors A/c',
      partnerId: contactId, partnerName: doc.vendorName, debit: amountPaid, credit: 0
    });
    je.lines.push({
      id: `jel-${generateId()}`, accountId: 'coa-1', accountName: 'Bank A/c',
      partnerId: contactId, partnerName: doc.vendorName, debit: 0, credit: amountPaid
    });
  } else {
    // Invoice Payment: Debit Bank (coa-1), Credit Debtors (coa-3)
    je.lines.push({
      id: `jel-${generateId()}`, accountId: 'coa-1', accountName: 'Bank A/c',
      partnerId: contactId, partnerName: doc.customerName, debit: amountPaid, credit: 0
    });
    je.lines.push({
      id: `jel-${generateId()}`, accountId: 'coa-3', accountName: 'Debtors A/c',
      partnerId: contactId, partnerName: doc.customerName, debit: 0, credit: amountPaid
    });
  }

  journalEntries.push(je);

  res.json({ success: true, doc, journalEntry: je });
}
