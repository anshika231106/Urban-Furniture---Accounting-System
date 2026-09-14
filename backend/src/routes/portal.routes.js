import { Router } from 'express';
import { getPortalDocs, payPortalDoc } from '../controllers/portal.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
// Only Contact role can access portal routes
router.use(requireRole('Contact'));

router.get('/documents', getPortalDocs);
router.post('/documents/:id/pay', payPortalDoc);

export default router;
