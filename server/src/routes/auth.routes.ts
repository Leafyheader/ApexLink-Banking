import { Router, RequestHandler } from 'express';
import { login, validateToken } from '../controllers/auth.controller';
import { validateLogin } from '../middleware/validators';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', validateLogin, login as RequestHandler);
router.get('/validate', authenticateToken, validateToken as RequestHandler);

export { router as authRouter };
