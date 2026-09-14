import { prisma } from '../lib/prisma.js';

/**
 * GET /api/categories
 * Fetch all categories from Prisma DB
 */
export async function getCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
}

/**
 * POST /api/categories
 * Create a new category in Prisma DB (or return existing if matched case-insensitively)
 */
export async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category Name is required.' });
    }

    const trimmed = name.trim();
    const existing = await prisma.category.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
    });

    if (existing) {
      return res.json(existing);
    }

    const newCat = await prisma.category.create({
      data: { name: trimmed },
    });

    res.status(201).json(newCat);
  } catch (err) {
    console.error('createCategory error:', err);
    res.status(500).json({ error: 'Failed to create category.' });
  }
}
