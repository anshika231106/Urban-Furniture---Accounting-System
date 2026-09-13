import { Router } from 'express';
import { getContacts, createContact, updateContact } from '../controllers/contact.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/contacts', getContacts);
router.post('/contacts', createContact);
router.put('/contacts/:id', updateContact);

export default router;
