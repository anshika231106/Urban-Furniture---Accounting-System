import { Router } from 'express';
import {
  getJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  updateJournalEntry,
  postJournalEntry,
  cancelJournalEntry,
} from '../controllers/journal.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protect all journal entry endpoints
router.use(requireAuth);

router.get('/journal-entries', getJournalEntries);
router.get('/journal-entries/:id', getJournalEntryById);
router.post('/journal-entries', createJournalEntry);
router.put('/journal-entries/:id', updateJournalEntry);
router.post('/journal-entries/:id/post', postJournalEntry);
router.post('/journal-entries/:id/cancel', cancelJournalEntry);

export default router;
