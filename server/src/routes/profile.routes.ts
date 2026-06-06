import { Router } from 'express';
import { validate } from '../middleware/validate';
import { healthProfileSchema, updateUserSchema } from '../schemas';
import * as profileController from '../controllers/profile.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/health-profile', profileController.getHealthProfile);
router.put('/health-profile', validate(healthProfileSchema), profileController.upsertHealthProfile);

// User account details
router.get('/', profileController.getMe);
router.patch('/', validate(updateUserSchema), profileController.updateMe);

// Stub for remaining
router.patch('/health-profile', (req, res) => res.status(501).json({ message: 'Patch not implemented' }));

export default router;
