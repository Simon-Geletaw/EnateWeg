import { Router } from 'express';
import { validate } from '../middleware/validate';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } from '../schemas';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/otp/send', validate(sendOtpSchema), authController.sendOtp);
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);

export default router;
