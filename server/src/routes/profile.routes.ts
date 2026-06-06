import { Router } from 'express';
import { validate } from '../middleware/validate';
import { healthProfileSchema } from '../schemas';
import * as profileController from '../controllers/profile.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/health-profile', profileController.getHealthProfile);
router.put('/health-profile', validate(healthProfileSchema), profileController.upsertHealthProfile);

// Stubs for remaining
router.patch('/health-profile', (req, res) => res.status(501).json({ message: 'Patch not implemented' }));
router.get('/', (req, res) => res.status(501).json({ message: 'Get user not implemented' }));
router.patch('/', (req, res) => res.status(501).json({ message: 'Patch user not implemented' }));

export default router;
