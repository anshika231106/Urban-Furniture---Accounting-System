import { Router } from 'express';
import {
  getChartOfAccounts,
  createChartOfAccount,
  getJournals,
  createJournal,
  getAnalyticAccounts,
  createAnalyticAccount,
} from '../controllers/accounting.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/chart-of-accounts', getChartOfAccounts);
router.post('/chart-of-accounts', createChartOfAccount);

router.get('/journals', getJournals);
router.post('/journals', createJournal);

router.get('/analytic-accounts', getAnalyticAccounts);
router.post('/analytic-accounts', createAnalyticAccount);

export default router;
