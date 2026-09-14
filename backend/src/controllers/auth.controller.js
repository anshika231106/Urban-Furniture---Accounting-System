import { users, tokens, sanitizeUser } from '../data/store.js';
import { generateId, generateToken } from '../utils/crypto.js';
import { validateLoginId, validateEmail, validatePassword } from '../utils/validation.js';
import { prisma } from '../data/prisma.js';
import bcrypt from 'bcryptjs';

export async function login(req, res) {
  const { loginId, password } = req.body;

  const cleanId = (loginId || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  let user = users.find(
    (u) => u.loginId.toLowerCase() === cleanId && u.password === cleanPass
  );

  if (!user) {
    const databaseUser = await prisma.user.findUnique({
      where: { loginId: cleanId },
    });

    if (databaseUser && (await bcrypt.compare(cleanPass, databaseUser.password))) {
      const role = {
        ADMIN: 'Admin',
        ACCOUNTANT: 'Accountant',
        CONTACT: 'Contact',
      }[databaseUser.role] || databaseUser.role;

      user = {
        id: databaseUser.id,
        name: databaseUser.name,
        loginId: databaseUser.loginId,
        email: databaseUser.email,
        password: cleanPass,
        role,
        contactId: databaseUser.contactId || null,
        createdAt: databaseUser.createdAt.toISOString(),
      };
      users.push(user);
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid Login Id or Password' });
  }

  const token = generateToken();
  tokens[token] = user.id;

  res.json({ token, user: sanitizeUser(user) });
}

export function signup(req, res) {
  const { loginId, email, password } = req.body;

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
}

export function createUser(req, res) {
  const { name, loginId, email, role, password } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const loginIdErr = validateLoginId(loginId);
  if (loginIdErr) return res.status(400).json({ error: loginIdErr });

  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: emailErr });

  const passwordErr = validatePassword(password);
  if (passwordErr) return res.status(400).json({ error: passwordErr });

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
}

export function getMe(req, res) {
  res.json({ user: sanitizeUser(req.user) });
}
