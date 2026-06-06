import { Router } from 'express';
import { validate } from '../middleware/validate';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } from '../schemas';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth'; // Ensure this path and name is correct in your project

const router = Router();

// Public Authentication
router.post('/otp/send', validate(sendOtpSchema), authController.sendOtp);
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/google', authController.googleLogin); // Add google login

// Token Management
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);

// Protected Profile Routes (User must be logged in)
router.get('/me', authenticate, authController.getMe);
router.post('/onboarding', authenticate, authController.onboard);

export default router;