import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../data/prisma.js';
import { sendPortalInviteEmail } from './mailer.js';

function randomFrom(chars) {
  return chars[crypto.randomInt(chars.length)];
}

function generateTempPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%*?';
  const all = upper + lower + digits + special;

  const required = [randomFrom(upper), randomFrom(lower), randomFrom(digits), randomFrom(special)];
  const rest = Array.from({ length: 8 }, () => randomFrom(all));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function generateUniqueLoginId(email) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'contact';
  const padded = base.length < 6 ? base.padEnd(6, '0') : base;

  let candidate = padded.slice(0, 12);
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({ where: { loginId: candidate } });
    if (!existing) return candidate;
    suffix += 1;
    const suffixStr = String(suffix);
    candidate = `${padded.slice(0, Math.max(6, 12 - suffixStr.length))}${suffixStr}`.slice(0, 12);
  }
}

/**
 * Creates a CONTACT-role portal login for a Contact and emails the credentials,
 * if the contact requested portal access and doesn't already have one.
 * Failures to send the email do not throw — the caller's save should still succeed.
 */
export async function provisionPortalAccessIfNeeded(contact) {
  if (!contact.portalAccessRequested || !contact.email) return;

  const existing = await prisma.user.findUnique({ where: { contactId: contact.id } });
  if (existing) return;

  try {
    const loginId = await generateUniqueLoginId(contact.email);
    const password = generateTempPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name: contact.name,
        loginId,
        email: contact.email,
        password: passwordHash,
        role: 'CONTACT',
        contactId: contact.id,
      },
    });

    await sendPortalInviteEmail({ to: contact.email, name: contact.name, loginId, password });
  } catch (err) {
    console.error(`Failed to provision portal access for contact ${contact.id}:`, err.message);
  }
}
