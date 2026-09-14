import { prisma } from '../lib/prisma.js';

function toContactTypeEnum(type) {
  if (!type) return 'CUSTOMER';
  const upper = String(type).toUpperCase();
  if (['CUSTOMER', 'VENDOR', 'BOTH'].includes(upper)) {
    return upper;
  }
  return 'CUSTOMER';
}

function fromContactTypeEnum(type) {
  switch (type) {
    case 'CUSTOMER':
      return 'Customer';
    case 'VENDOR':
      return 'Vendor';
    case 'BOTH':
      return 'Both';
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Customer';
  }
}

function formatContact(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone || '',
    street: c.street || '',
    city: c.city || '',
    state: c.state || '',
    country: c.country || '',
    pincode: c.pincode || '',
    type: fromContactTypeEnum(c.type),
    imageUrl: c.imageUrl || '',
    archived: Boolean(c.archived),
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * GET /api/contacts
 * Query params: ?type=Vendor|Customer|Both&includeArchived=true
 */
export async function getContacts(req, res) {
  try {
    const { type, includeArchived } = req.query;
    const where = {};
    if (includeArchived !== 'true') {
      where.archived = false;
    }
    if (type) {
      const typeEnum = toContactTypeEnum(type);
      if (typeEnum === 'VENDOR') {
        where.type = { in: ['VENDOR', 'BOTH'] };
      } else if (typeEnum === 'CUSTOMER') {
        where.type = { in: ['CUSTOMER', 'BOTH'] };
      } else {
        where.type = typeEnum;
      }
    }

    const list = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(list.map(formatContact));
  } catch (err) {
    console.error('getContacts error:', err);
    res.status(500).json({ error: 'Failed to fetch contacts from database.' });
  }
}

/**
 * POST /api/contacts
 */
export async function createContact(req, res) {
  try {
    const { name, email, phone, street, city, state, country, pincode, type, imageUrl } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Contact Name is required.' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required.' });

    const existing = await prisma.contact.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return res.status(400).json({ error: 'Contact with this email already exists.' });
    }

    const created = await prisma.contact.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || null,
        street: street || null,
        city: city || null,
        state: state || null,
        country: country || null,
        pincode: pincode || null,
        type: toContactTypeEnum(type),
        imageUrl: imageUrl || null,
        archived: false,
      },
    });

    res.status(201).json(formatContact(created));
  } catch (err) {
    console.error('createContact error:', err);
    res.status(500).json({ error: 'Failed to create contact in database.' });
  }
}

/**
 * PUT /api/contacts/:id
 */
export async function updateContact(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Contact not found.' });

    const { name, email, phone, street, city, state, country, pincode, type, imageUrl, archived } = req.body;

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (email !== undefined) data.email = email.trim().toLowerCase();
    if (phone !== undefined) data.phone = phone;
    if (street !== undefined) data.street = street;
    if (city !== undefined) data.city = city;
    if (state !== undefined) data.state = state;
    if (country !== undefined) data.country = country;
    if (pincode !== undefined) data.pincode = pincode;
    if (type !== undefined) data.type = toContactTypeEnum(type);
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (archived !== undefined) data.archived = Boolean(archived);

    const updated = await prisma.contact.update({
      where: { id },
      data,
    });

    res.json(formatContact(updated));
  } catch (err) {
    console.error('updateContact error:', err);
    res.status(500).json({ error: 'Failed to update contact.' });
  }
}

