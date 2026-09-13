import { Router } from 'express';
import { login, signup, createUser, getMe } from '../controllers/auth.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/create-user', requireAuth, requireRole('Admin'), createUser);
router.get('/me', requireAuth, getMe);

export default router;
