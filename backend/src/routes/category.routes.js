import { Router } from 'express';
import { getCategories, createCategory } from '../controllers/category.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/categories', getCategories);
router.post('/categories', createCategory);

export default router;
