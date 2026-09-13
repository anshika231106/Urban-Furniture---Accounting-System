import { users } from '../data/store.js';

export function validateLoginId(loginId) {
  if (!loginId || loginId.trim().length === 0) return 'Login Id is required.';
  const trimmed = loginId.trim();
  if (trimmed.length < 6) return 'Login Id must be at least 6 characters.';
  if (trimmed.length > 12) return 'Login Id must be at most 12 characters.';
  if (users.some((u) => u.loginId === trimmed)) return 'Login Id already exists.';
  return null;
}

export function validateEmail(email) {
  if (!email || email.trim().length === 0) return 'Email Id is required.';
  const trimmed = email.trim();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(trimmed)) return 'Invalid email format.';
  if (users.some((u) => u.email === trimmed)) return 'Email Id already exists.';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length <= 8) return 'Password must be more than 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must contain a special character.';
  if (users.some((u) => u.password === password)) return 'Password must be unique.';
  return null;
}
