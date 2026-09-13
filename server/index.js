/**
 * Minimal stub backend for Urban Furniture Accounting System.
 * Provides auth endpoints with in-memory data storage.
 * This will be replaced with a proper backend + database later.
 *
 * Run: node server/index.js
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============================================================
// In-memory data stores
// ============================================================

const users = [
  {
    id: '1',
    name: 'Admin',
    loginId: 'admin1',
    email: 'admin@urbanfurniture.com',
    password: 'Admin@123!',
    role: 'Admin',
    createdAt: new Date().toISOString(),
  },
];

// Simple token store: token -> userId
const tokens = {};

// ============================================================
// Helpers
// ============================================================

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function findUserByToken(token) {
  const userId = tokens[token];
  if (!userId) return null;
  return users.find((u) => u.id === userId) || null;
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

// Validation — mirrors client-side rules from MVP.md Section 2
function validateLoginId(loginId) {
  if (!loginId || loginId.trim().length === 0) return 'Login Id is required.';
  const trimmed = loginId.trim();
  if (trimmed.length < 6) return 'Login Id must be at least 6 characters.';
  if (trimmed.length > 12) return 'Login Id must be at most 12 characters.';
  if (users.some((u) => u.loginId === trimmed)) return 'Login Id already exists.';
  return null;
}

function validateEmail(email) {
  if (!email || email.trim().length === 0) return 'Email Id is required.';
  const trimmed = email.trim();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(trimmed)) return 'Invalid email format.';
  if (users.some((u) => u.email === trimmed)) return 'Email Id already exists.';
  return null;
}

function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length <= 8) return 'Password must be more than 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must contain a special character.';
  // Uniqueness check per spec
  if (users.some((u) => u.password === password)) return 'Password must be unique.';
  return null;
}

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = authHeader.slice(7);
  const user = findUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    next();
  };
}

// ============================================================
// Auth endpoints
// ============================================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { loginId, password } = req.body;

  const user = users.find(
    (u) => u.loginId === loginId && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid Login Id or Password' });
  }

  const token = generateToken();
  tokens[token] = user.id;

  res.json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/signup — creates Accountant (Invoicing User) only
app.post('/api/auth/signup', (req, res) => {
  const { loginId, email, password } = req.body;

  // Validate
  const loginIdErr = validateLoginId(loginId);
  if (loginIdErr) return res.status(400).json({ error: loginIdErr });

  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: emailErr });

  const passwordErr = validatePassword(password);
  if (passwordErr) return res.status(400).json({ error: passwordErr });

  const newUser = {
    id: generateId(),
    name: loginId.trim(),
    loginId: loginId.trim(),
    email: email.trim(),
    password,
    role: 'Accountant',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  const token = generateToken();
  tokens[token] = newUser.id;

  res.status(201).json({ token, user: sanitizeUser(newUser) });
});

// POST /api/auth/create-user — Admin only
app.post('/api/auth/create-user', requireAuth, requireRole('Admin'), (req, res) => {
  const { name, loginId, email, role, password } = req.body;

  // Validate
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const loginIdErr = validateLoginId(loginId);
  if (loginIdErr) return res.status(400).json({ error: loginIdErr });

  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: emailErr });

  const passwordErr = validatePassword(password);
  if (passwordErr) return res.status(400).json({ error: passwordErr });

  // Role must be Admin or Accountant (spec says radio: User / Administrator)
  const validRoles = ['Admin', 'Accountant'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  const newUser = {
    id: generateId(),
    name: name.trim(),
    loginId: loginId.trim(),
    email: email.trim(),
    password,
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  res.status(201).json({ user: sanitizeUser(newUser) });
});

// GET /api/auth/me — return current user from token
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// ============================================================
// Master Data Stores (Phase 2)
// ============================================================

// 4.3 Chart of Accounts — 8 pre-seeded default accounts
const chartOfAccounts = [
  { id: 'coa-1', name: 'Bank A/c', type: 'Asset' },
  { id: 'coa-2', name: 'Cash A/c', type: 'Asset' },
  { id: 'coa-3', name: 'Debtors A/c', type: 'Asset' },
  { id: 'coa-4', name: 'Creditors A/c', type: 'Liability' },
  { id: 'coa-5', name: 'Sales Income A/c', type: 'Income' },
  { id: 'coa-6', name: 'Purchase Expense A/c', type: 'Expense' },
  { id: 'coa-7', name: 'Other Expense A/c', type: 'Expense' },
  { id: 'coa-8', name: 'Capital A/c', type: 'Capital' },
];

// 4.4 Journals — 4 pre-seeded default journals
const journals = [
  { id: 'j-1', name: 'Sales', type: 'Sales', defaultAccount: 'Sales Income A/c' },
  { id: 'j-2', name: 'Purchase', type: 'Purchase', defaultAccount: 'Purchase Expense A/c' },
  { id: 'j-3', name: 'Bank', type: 'Bank', defaultAccount: 'Bank A/c' },
  { id: 'j-4', name: 'Cash', type: 'Cash', defaultAccount: 'Cash A/c' },
];

// 4.1 Contact Master
const contacts = [
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
const categories = [
  { id: 'cat-1', name: 'Seating' },
  { id: 'cat-2', name: 'Tables & Desks' },
  { id: 'cat-3', name: 'Storage' },
  { id: 'cat-4', name: 'Accessories' },
];

// 4.2 Product Master
const products = [
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
const analyticAccounts = [
  { id: 'an-1', name: 'Project Alpha', type: 'Income' },
  { id: 'an-2', name: 'Showroom Operations', type: 'Expenses' },
];

// ============================================================
// Master Data Endpoints (Phase 2)
// ============================================================

// --- Chart of Accounts ---
app.get('/api/chart-of-accounts', requireAuth, (req, res) => {
  res.json(chartOfAccounts);
});

app.post('/api/chart-of-accounts', requireAuth, (req, res) => {
  const { name, type } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Account Name is required.' });
  if (!type) return res.status(400).json({ error: 'Account Type is required.' });

  const newAccount = { id: `coa-${generateId()}`, name: name.trim(), type };
  chartOfAccounts.push(newAccount);
  res.status(201).json(newAccount);
});

// --- Journals ---
app.get('/api/journals', requireAuth, (req, res) => {
  res.json(journals);
});

app.post('/api/journals', requireAuth, (req, res) => {
  const { name, type, defaultAccount } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Journal Name is required.' });
  if (!type) return res.status(400).json({ error: 'Journal Type is required.' });

  const newJournal = { id: `j-${generateId()}`, name: name.trim(), type, defaultAccount: defaultAccount || '' };
  journals.push(newJournal);
  res.status(201).json(newJournal);
});

// --- Contacts ---
app.get('/api/contacts', requireAuth, (req, res) => {
  res.json(contacts);
});

app.post('/api/contacts', requireAuth, (req, res) => {
  const { name, email, phone, street, city, state, country, pincode, type, imageUrl } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Contact Name is required.' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required.' });

  if (contacts.some((c) => c.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Contact with this email already exists.' });
  }

  const newContact = {
    id: `c-${generateId()}`,
    name: name.trim(),
    email: email.trim(),
    phone: phone || '',
    street: street || '',
    city: city || '',
    state: state || '',
    country: country || '',
    pincode: pincode || '',
    type: type || 'Customer',
    imageUrl: imageUrl || '',
    createdAt: new Date().toISOString(),
  };

  contacts.push(newContact);
  res.status(201).json(newContact);
});

app.put('/api/contacts/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const index = contacts.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Contact not found.' });

  const { name, email, phone, street, city, state, country, pincode, type, imageUrl } = req.body;

  contacts[index] = {
    ...contacts[index],
    name: name ? name.trim() : contacts[index].name,
    email: email ? email.trim() : contacts[index].email,
    phone: phone ?? contacts[index].phone,
    street: street ?? contacts[index].street,
    city: city ?? contacts[index].city,
    state: state ?? contacts[index].state,
    country: country ?? contacts[index].country,
    pincode: pincode ?? contacts[index].pincode,
    type: type ?? contacts[index].type,
    imageUrl: imageUrl ?? contacts[index].imageUrl,
  };

  res.json(contacts[index]);
});

// --- Product Categories ---
app.get('/api/categories', requireAuth, (req, res) => {
  res.json(categories);
});

app.post('/api/categories', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category Name is required.' });

  const existing = categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return res.json(existing);

  const newCat = { id: `cat-${generateId()}`, name: name.trim() };
  categories.push(newCat);
  res.status(201).json(newCat);
});

// --- Products ---
app.get('/api/products', requireAuth, (req, res) => {
  res.json(products);
});

app.post('/api/products', requireAuth, (req, res) => {
  const { name, type, category, salesPrice, cost, imageUrl } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Product Name is required.' });
  if (!type) return res.status(400).json({ error: 'Product Type is required.' });

  const newProduct = {
    id: `p-${generateId()}`,
    name: name.trim(),
    type,
    category: category || 'General',
    salesPrice: Number(salesPrice) || 0,
    cost: Number(cost) || 0,
    imageUrl: imageUrl || '',
    createdAt: new Date().toISOString(),
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Product not found.' });

  const { name, type, category, salesPrice, cost, imageUrl } = req.body;

  products[index] = {
    ...products[index],
    name: name ? name.trim() : products[index].name,
    type: type ?? products[index].type,
    category: category ?? products[index].category,
    salesPrice: salesPrice !== undefined ? Number(salesPrice) : products[index].salesPrice,
    cost: cost !== undefined ? Number(cost) : products[index].cost,
    imageUrl: imageUrl ?? products[index].imageUrl,
  };

  res.json(products[index]);
});

// --- Analytic Accounts ---
app.get('/api/analytic-accounts', requireAuth, (req, res) => {
  res.json(analyticAccounts);
});

app.post('/api/analytic-accounts', requireAuth, (req, res) => {
  const { name, type } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Analytic Account Name is required.' });
  if (!type) return res.status(400).json({ error: 'Type (Income/Expenses) is required.' });

  const newAnalytic = { id: `an-${generateId()}`, name: name.trim(), type };
  analyticAccounts.push(newAnalytic);
  res.status(201).json(newAnalytic);
});

// ============================================================
// Start server
// ============================================================

app.listen(PORT, () => {
  console.log(`\n  Urban Furniture API stub running on http://localhost:${PORT}`);
  console.log(`  Default admin: loginId="admin1", password="Admin@123!"\n`);
});

