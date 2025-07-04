import { Router, RequestHandler } from 'express';
import { login, register, validateToken } from '../controllers/auth.controller';
import { validateLogin, validateUserRegistration } from '../middleware/validators';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

router.post('/login', validateLogin, login as RequestHandler);
router.post('/register', authenticateToken, requireRole(['ADMIN']), validateUserRegistration, register as RequestHandler);
router.get('/validate', authenticateToken, validateToken as RequestHandler);

export { router as authRouter };
