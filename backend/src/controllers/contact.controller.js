import { contacts } from '../data/store.js';
import { generateId } from '../utils/crypto.js';

export function getContacts(req, res) {
  res.json(contacts);
}

export function createContact(req, res) {
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
}

export function updateContact(req, res) {
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
}
