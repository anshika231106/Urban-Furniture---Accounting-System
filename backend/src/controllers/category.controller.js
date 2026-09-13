import { categories } from '../data/store.js';
import { generateId } from '../utils/crypto.js';

export function getCategories(req, res) {
  res.json(categories);
}

export function createCategory(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category Name is required.' });

  const existing = categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return res.json(existing);

  const newCat = { id: `cat-${generateId()}`, name: name.trim() };
  categories.push(newCat);
  res.status(201).json(newCat);
}
