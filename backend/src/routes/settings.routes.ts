import { Router, RequestHandler } from 'express';
import { getSettings, updateSettings, getTreasuryBalance, getTreasurySummary, fundTreasury } from '../controllers/settings.controller';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleAuth';

const router = Router();

router.use(authenticateToken);

// Readable by any authenticated user - the withdrawal fee is shown on transaction forms.
router.get('/', getSettings as RequestHandler);

// Readable by any authenticated user - shown on the Expenses page.
router.get('/treasury/balance', getTreasuryBalance as RequestHandler);

// Admin-only.
router.put('/', requireAdmin, updateSettings as RequestHandler);
router.get('/treasury', requireAdmin, getTreasurySummary as RequestHandler);
router.post('/treasury/fund', requireAdmin, fundTreasury as RequestHandler);

export default router;
