import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
} from '../controllers/product.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', archiveProduct);

export default router;

