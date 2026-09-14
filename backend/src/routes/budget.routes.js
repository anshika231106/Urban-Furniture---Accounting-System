import { Router } from 'express';
import {
	getBudgetOptions,
	getBudgets,
	getBudgetById,
	createBudget,
	updateBudget,
	confirmBudget,
	reviseBudget,
	cancelBudget,
	getBudgetLineActivity,
	getBudgetReport,
} from '../controllers/budget.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/budgets/options', getBudgetOptions);
router.get('/budgets', getBudgets);
router.get('/budgets/:id', getBudgetById);
router.post('/budgets', createBudget);
router.put('/budgets/:id', updateBudget);
router.post('/budgets/:id/confirm', confirmBudget);
router.post('/budgets/:id/revise', reviseBudget);
router.post('/budgets/:id/cancel', cancelBudget);
router.get('/budgets/:id/lines/:lineId/activity', getBudgetLineActivity);
router.get('/reports/budget', getBudgetReport);

export default router;
