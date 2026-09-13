import crypto from 'crypto';

export function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}
