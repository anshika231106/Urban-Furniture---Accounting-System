import { Router } from 'express';
import { getProducts, createProduct, updateProduct } from '../controllers/product.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);

export default router;
