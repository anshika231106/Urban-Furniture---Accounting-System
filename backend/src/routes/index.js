import { Router } from 'express';
import authRoutes from './auth.routes.js';
import accountingRoutes from './accounting.routes.js';
import contactRoutes from './contact.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import journalRoutes from './journal.routes.js';
import portalRoutes from './portal.routes.js';
import budgetRoutes from './budget.routes.js';
import purchaseRoutes from './purchase.routes.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use('/auth', authRoutes);

// Portal Routes (has own auth/role checks inside)
router.use('/portal', portalRoutes);

// Internal routes (Admin and Accountant only)
const internalMiddleware = [requireAuth, requireRole('Admin', 'Accountant')];

router.use('/', internalMiddleware, accountingRoutes);
router.use('/', internalMiddleware, contactRoutes);
router.use('/', internalMiddleware, categoryRoutes);
router.use('/', internalMiddleware, productRoutes);
router.use('/', internalMiddleware, journalRoutes);
router.use('/', internalMiddleware, purchaseRoutes);
router.use('/', budgetRoutes);

export default router;

