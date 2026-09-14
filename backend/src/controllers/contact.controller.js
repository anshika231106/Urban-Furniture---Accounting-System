import { prisma } from '../data/prisma.js';
import { provisionPortalAccessIfNeeded } from '../utils/portalAccess.js';

const TYPE_TO_DB = {
  Customer: 'CUSTOMER',
  Vendor: 'VENDOR',
  Both: 'BOTH',
};

const TYPE_TO_UI = {
  CUSTOMER: 'Customer',
  VENDOR: 'Vendor',
  BOTH: 'Both',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serializeContact(contact) {
  return {
    id: contact.id,
    name: contact.name,
    type: TYPE_TO_UI[contact.type] || contact.type,
    email: contact.email,
    phone: contact.phone || '',
    street: contact.street || '',
    city: contact.city || '',
    state: contact.state || '',
    country: contact.country || '',
    pincode: contact.pincode || '',
    imageUrl: contact.imageUrl || '',
    portalAccessRequested: contact.portalAccessRequested,
    createdAt: contact.createdAt,
  };
}

function validateContactInput(body) {
  const { name, type, email } = body;
  if (!name || !name.trim()) return 'Contact Name is required.';
  if (!type || !TYPE_TO_DB[type]) return 'Type is required.';
  if (!email || !email.trim()) return 'Email is required.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Please enter a valid email address.';
  return null;
}

/**
 * GET /contacts?search=
 */
export async function getContacts(req, res) {
  const search = (req.query.search || '').trim();
  const contacts = await prisma.contact.findMany({
    where: search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
      : {},
    orderBy: { name: 'asc' },
  });
  res.json(contacts.map(serializeContact));
}

export async function createContact(req, res) {
  const validationError = validateContactInput(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { name, type, email, phone, street, city, state, country, pincode, imageUrl, portalAccessRequested } = req.body;
  const cleanEmail = email.trim();

  const existing = await prisma.contact.findFirst({
    where: { email: { equals: cleanEmail, mode: 'insensitive' } },
  });
  if (existing) return res.status(400).json({ error: 'A contact with this email already exists.' });

  const contact = await prisma.contact.create({
    data: {
      name: name.trim(),
      type: TYPE_TO_DB[type],
      email: cleanEmail,
      phone: phone?.trim() || null,
      street: street?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || null,
      pincode: pincode?.trim() || null,
      imageUrl: imageUrl || null,
      portalAccessRequested: Boolean(portalAccessRequested) && Boolean(cleanEmail),
    },
  });

  await provisionPortalAccessIfNeeded(contact);

  res.status(201).json(serializeContact(contact));
}

export async function updateContact(req, res) {
  const { id } = req.params;
  const existingContact = await prisma.contact.findUnique({ where: { id } });
  if (!existingContact) return res.status(404).json({ error: 'Contact not found.' });

  const validationError = validateContactInput(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { name, type, email, phone, street, city, state, country, pincode, imageUrl, portalAccessRequested } = req.body;
  const cleanEmail = email.trim();

  const duplicate = await prisma.contact.findFirst({
    where: { email: { equals: cleanEmail, mode: 'insensitive' }, NOT: { id } },
  });
  if (duplicate) return res.status(400).json({ error: 'A contact with this email already exists.' });

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      name: name.trim(),
      type: TYPE_TO_DB[type],
      email: cleanEmail,
      phone: phone?.trim() || null,
      street: street?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || null,
      pincode: pincode?.trim() || null,
      imageUrl: imageUrl || null,
      portalAccessRequested: Boolean(portalAccessRequested) && Boolean(cleanEmail),
    },
  });

  await provisionPortalAccessIfNeeded(contact);

  res.json(serializeContact(contact));
}
