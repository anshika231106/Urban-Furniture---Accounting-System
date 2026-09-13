/**
 * In-memory data store for Urban Furniture Accounting System backend.
 */

export const users = [
  {
    id: '1',
    name: 'Admin User',
    loginId: 'admin1',
    email: 'admin@urbanfurniture.com',
    password: 'Admin@123!',
    role: 'Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Standard User',
    loginId: 'user1',
    email: 'user1@urbanfurniture.com',
    password: 'User@123!',
    role: 'Accountant',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Quick User',
    loginId: 'user',
    email: 'user@urbanfurniture.com',
    password: 'user',
    role: 'Accountant',
    createdAt: new Date().toISOString(),
  },
];

// Simple token store: token -> userId
export const tokens = {};

// 4.3 Chart of Accounts
export const chartOfAccounts = [
  { id: 'coa-1', name: 'Bank A/c', type: 'Asset' },
  { id: 'coa-2', name: 'Cash A/c', type: 'Asset' },
  { id: 'coa-3', name: 'Debtors A/c', type: 'Asset' },
  { id: 'coa-4', name: 'Creditors A/c', type: 'Liability' },
  { id: 'coa-5', name: 'Sales Income A/c', type: 'Income' },
  { id: 'coa-6', name: 'Purchase Expense A/c', type: 'Expense' },
  { id: 'coa-7', name: 'Other Expense A/c', type: 'Expense' },
  { id: 'coa-8', name: 'Capital A/c', type: 'Capital' },
];

// 4.4 Journals
export const journals = [
  { id: 'j-1', name: 'Sales', type: 'Sales', defaultAccount: 'Sales Income A/c' },
  { id: 'j-2', name: 'Purchase', type: 'Purchase', defaultAccount: 'Purchase Expense A/c' },
  { id: 'j-3', name: 'Bank', type: 'Bank', defaultAccount: 'Bank A/c' },
  { id: 'j-4', name: 'Cash', type: 'Cash', defaultAccount: 'Cash A/c' },
];

// 4.1 Contacts
export const contacts = [
  {
    id: 'c-1',
    name: 'Acme Furniture Supplies',
    email: 'contact@acmefurniture.com',
    phone: '+1 555-0192',
    street: '100 Industrial Parkway',
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    pincode: '60601',
    type: 'Vendor',
    imageUrl: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c-2',
    name: 'Urban Living Studios',
    email: 'orders@urbanliving.io',
    phone: '+1 555-0144',
    street: '450 Design Avenue',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    pincode: '10001',
    type: 'Customer',
    imageUrl: '',
    createdAt: new Date().toISOString(),
  },
];

// Product Categories
export const categories = [
  { id: 'cat-1', name: 'Seating' },
  { id: 'cat-2', name: 'Tables & Desks' },
  { id: 'cat-3', name: 'Storage' },
  { id: 'cat-4', name: 'Accessories' },
];

// 4.2 Products
export const products = [
  {
    id: 'p-1',
    name: 'Ergonomic Executive Chair',
    type: 'Goods',
    category: 'Seating',
    salesPrice: 450,
    cost: 220,
    imageUrl: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-2',
    name: 'Solid Oak Dining Table',
    type: 'Goods',
    category: 'Tables & Desks',
    salesPrice: 1200,
    cost: 650,
    imageUrl: '',
    createdAt: new Date().toISOString(),
  },
];

// 5.1 Analytic Accounts
export const analyticAccounts = [
  { id: 'an-1', name: 'Project Alpha', type: 'Income' },
  { id: 'an-2', name: 'Showroom Operations', type: 'Expenses' },
];

// 4.5 Journal Entries
export const journalEntries = [
  {
    id: 'je-1',
    number: 'MISC/2026/0001',
    accountingDate: new Date().toISOString().split('T')[0],
    journalId: 'j-3',
    journalName: 'Bank',
    partnerId: 'c-2',
    partnerName: 'Urban Living Studios',
    status: 'Posted',
    total: 1000,
    lines: [
      {
        id: 'jel-1',
        accountId: 'coa-1',
        accountName: 'Bank A/c',
        partnerId: 'c-2',
        partnerName: 'Urban Living Studios',
        debit: 1000,
        credit: 0,
      },
      {
        id: 'jel-2',
        accountId: 'coa-5',
        accountName: 'Sales Income A/c',
        partnerId: 'c-2',
        partnerName: 'Urban Living Studios',
        debit: 0,
        credit: 1000,
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

// Sequence counters
let journalEntrySequence = 1;

export function getNextJournalEntryNumber(journalName = 'MISC') {
  journalEntrySequence += 1;
  const prefix = journalName.substring(0, 4).toUpperCase();
  const year = new Date().getFullYear();
  const seq = String(journalEntrySequence).padStart(4, '0');
  return `${prefix}/${year}/${seq}`;
}

// Data helper functions
export function findUserByToken(token) {
  const userId = tokens[token];
  if (!userId) return null;
  return users.find((u) => u.id === userId) || null;
}

export function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}
