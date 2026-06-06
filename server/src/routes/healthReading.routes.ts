import { Router } from 'express';
import { validate } from '../middleware/validate';
import { healthReadingSchema } from '../schemas';
import * as healthReadingController from '../controllers/healthReading.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', validate(healthReadingSchema), healthReadingController.logHealthReading);
router.get('/', healthReadingController.getHealthReadings);

export default router;
