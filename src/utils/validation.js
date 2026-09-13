/**
 * Validation utilities — implements exact rules from MVP.md Section 2.
 */

/**
 * Login Id: unique, must be 6–12 characters.
 * Uniqueness is checked server-side; this validates format only.
 */
export function validateLoginId(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Login Id is required.';
  if (trimmed.length < 6) return 'Login Id must be at least 6 characters.';
  if (trimmed.length > 12) return 'Login Id must be at most 12 characters.';
  return '';
}

/**
 * Email: basic format check. Uniqueness is checked server-side.
 */
export function validateEmail(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Email Id is required.';
  // Simple RFC-style check — not exhaustive, but catches obvious mistakes
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(trimmed)) return 'Enter a valid email address.';
  return '';
}

/**
 * Password: must contain at least one lowercase, one uppercase, one special
 * character, and be more than 8 characters long.
 * "more than 8" means length > 8, so minimum is 9 characters.
 */
export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length <= 8) return 'Password must be more than 8 characters.';
  if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter.';
  if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter.';
  if (!/[^a-zA-Z0-9]/.test(value)) return 'Password must contain a special character.';
  return '';
}

/**
 * Check password match.
 */
export function validatePasswordMatch(password, rePassword) {
  if (password !== rePassword) return 'Passwords do not match.';
  return '';
}
