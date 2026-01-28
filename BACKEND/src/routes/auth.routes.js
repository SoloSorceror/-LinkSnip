import express from 'express';
import passport from 'passport';
import { register, login, getMe, googleCallback, sendOtp, resetPassword } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { otpLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/reset-password', resetPassword);

// Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false }), googleCallback);

// Protected routes
router.get('/me', protect, getMe);

export default router;
