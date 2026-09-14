import { Router } from 'express';
import {
  getChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  archiveChartOfAccount,
  getJournals,
  createJournal,
  updateJournal,
  getAnalyticAccounts,
  createAnalyticAccount,
} from '../controllers/accounting.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/chart-of-accounts', getChartOfAccounts);
router.post('/chart-of-accounts', createChartOfAccount);
router.put('/chart-of-accounts/:id', updateChartOfAccount);
router.delete('/chart-of-accounts/:id', archiveChartOfAccount);

router.get('/journals', getJournals);
router.post('/journals', createJournal);
router.put('/journals/:id', updateJournal);

router.get('/analytic-accounts', getAnalyticAccounts);
router.post('/analytic-accounts', createAnalyticAccount);

export default router;

