import { prisma } from '../lib/prisma.js';

function toProductTypeEnum(type) {
  if (!type) return 'GOODS';
  const upper = String(type).toUpperCase();
  if (['GOODS', 'SERVICE', 'COMBO'].includes(upper)) {
    return upper;
  }
  return 'GOODS';
}

function fromProductTypeEnum(type) {
  switch (type) {
    case 'GOODS':
      return 'Goods';
    case 'SERVICE':
      return 'Service';
    case 'COMBO':
      return 'Combo';
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Goods';
  }
}

function formatProduct(product) {
  return {
    id: product.id,
    name: product.name,
    type: fromProductTypeEnum(product.type),
    categoryId: product.categoryId || null,
    category: product.category ? product.category.name : 'General',
    salesPrice: Number(product.salesPrice || 0),
    cost: Number(product.cost || 0),
    imageUrl: product.imageUrl || '',
    archived: Boolean(product.archived),
  };
}

/**
 * GET /api/products
 * Fetch all products from Prisma DB (with optional ?includeArchived=true)
 */
export async function getProducts(req, res) {
  try {
    const { includeArchived } = req.query;
    const where = {};
    if (includeArchived !== 'true') {
      where.archived = false;
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    res.json(products.map(formatProduct));
  } catch (err) {
    console.error('getProducts error:', err);
    res.status(500).json({ error: 'Failed to fetch products from database.' });
  }
}

/**
 * GET /api/products/:id
 */
export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(formatProduct(product));
  } catch (err) {
    console.error('getProductById error:', err);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
}

/**
 * POST /api/products
 * Create a new product in Prisma DB
 */
export async function createProduct(req, res) {
  try {
    const { name, type, category, categoryId, salesPrice, cost, imageUrl } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product Name is required.' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Product Type is required.' });
    }

    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && category && category.trim()) {
      const catName = category.trim();
      let catRecord = await prisma.category.findFirst({
        where: { name: { equals: catName, mode: 'insensitive' } },
      });
      if (!catRecord) {
        catRecord = await prisma.category.create({
          data: { name: catName },
        });
      }
      resolvedCategoryId = catRecord.id;
    }

    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        type: toProductTypeEnum(type),
        categoryId: resolvedCategoryId || null,
        salesPrice: Number(salesPrice) || 0,
        cost: Number(cost) || 0,
        imageUrl: imageUrl || null,
        archived: false,
      },
      include: { category: true },
    });

    res.status(201).json(formatProduct(newProduct));
  } catch (err) {
    console.error('createProduct error:', err);
    res.status(500).json({ error: 'Failed to create product in database.' });
  }
}

/**
 * PUT /api/products/:id
 * Update an existing product in Prisma DB
 */
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const { name, type, category, categoryId, salesPrice, cost, imageUrl, archived } = req.body;

    let resolvedCategoryId = categoryId !== undefined ? categoryId : existing.categoryId;
    if (category !== undefined && typeof category === 'string' && category.trim()) {
      const catName = category.trim();
      let catRecord = await prisma.category.findFirst({
        where: { name: { equals: catName, mode: 'insensitive' } },
      });
      if (!catRecord) {
        catRecord = await prisma.category.create({
          data: { name: catName },
        });
      }
      resolvedCategoryId = catRecord.id;
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = toProductTypeEnum(type);
    if (resolvedCategoryId !== undefined) updateData.categoryId = resolvedCategoryId;
    if (salesPrice !== undefined) updateData.salesPrice = Number(salesPrice) || 0;
    if (cost !== undefined) updateData.cost = Number(cost) || 0;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (archived !== undefined) updateData.archived = Boolean(archived);

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    res.json(formatProduct(updated));
  } catch (err) {
    console.error('updateProduct error:', err);
    res.status(500).json({ error: 'Failed to update product in database.' });
  }
}

/**
 * DELETE /api/products/:id
 * Toggle archive status / soft-delete
 */
export async function archiveProduct(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { archived: !existing.archived },
      include: { category: true },
    });

    res.json(formatProduct(updated));
  } catch (err) {
    console.error('archiveProduct error:', err);
    res.status(500).json({ error: 'Failed to archive product.' });
  }
}
