import { Router } from 'express';
import { validate } from '../middleware/validate';
import { logMealSchema, logWaterSchema } from '../schemas';
import * as logController from '../controllers/log.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/daily/:date', logController.getDailyLogs);
router.post('/daily/:date/meals', validate(logMealSchema), logController.logMeal);
router.post('/daily/:date/water', validate(logWaterSchema), logController.logWater);
router.post('/weight', (req, res) => res.status(501).json({ message: 'Weight logging not implemented' }));

export default router;
