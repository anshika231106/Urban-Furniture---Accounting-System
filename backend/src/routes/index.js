import { Router } from 'express';
import authRoutes from './auth.routes.js';
import accountingRoutes from './accounting.routes.js';
import contactRoutes from './contact.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', accountingRoutes);
router.use('/', contactRoutes);
router.use('/', categoryRoutes);
router.use('/', productRoutes);

export default router;
