import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { getAuditEventById, getAuditEvents } from '../controllers/audit.controller';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'MANAGER']));

router.get('/', getAuditEvents as RequestHandler);
router.get('/:id', getAuditEventById as RequestHandler);

export default router;