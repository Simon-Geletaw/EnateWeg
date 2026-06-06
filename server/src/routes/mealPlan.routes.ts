import { Router } from 'express';
import * as mealPlanController from '../controllers/mealPlan.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/current', mealPlanController.getCurrentPlan);
router.get('/current/weekly', mealPlanController.getCurrentWeeklyPlan);
router.post('/generate', mealPlanController.generatePlan);

export default router;
