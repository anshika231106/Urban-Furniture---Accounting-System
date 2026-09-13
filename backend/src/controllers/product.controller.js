import { products } from '../data/store.js';
import { generateId } from '../utils/crypto.js';

export function getProducts(req, res) {
  res.json(products);
}

export function createProduct(req, res) {
  const { name, type, category, salesPrice, cost, imageUrl } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Product Name is required.' });
  if (!type) return res.status(400).json({ error: 'Product Type is required.' });

  const newProduct = {
    id: `p-${generateId()}`,
    name: name.trim(),
    type,
    category: category || 'General',
    salesPrice: Number(salesPrice) || 0,
    cost: Number(cost) || 0,
    imageUrl: imageUrl || '',
    createdAt: new Date().toISOString(),
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
}

export function updateProduct(req, res) {
  const { id } = req.params;
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Product not found.' });

  const { name, type, category, salesPrice, cost, imageUrl } = req.body;

  products[index] = {
    ...products[index],
    name: name ? name.trim() : products[index].name,
    type: type ?? products[index].type,
    category: category ?? products[index].category,
    salesPrice: salesPrice !== undefined ? Number(salesPrice) : products[index].salesPrice,
    cost: cost !== undefined ? Number(cost) : products[index].cost,
    imageUrl: imageUrl ?? products[index].imageUrl,
  };

  res.json(products[index]);
}
