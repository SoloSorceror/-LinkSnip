import express from 'express';
import { createUrl, createAnonymousUrl, getUserUrls, getUrlAnalytics, deleteUrl, claimUrl } from '../controllers/url.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { urlCreationLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// Public route - anonymous URL creation (with rate limit)
router.post('/anonymous', urlCreationLimiter, createAnonymousUrl);

// Protected routes (require authentication)
router.post('/', protect, urlCreationLimiter, createUrl);
router.get('/', protect, getUserUrls);
router.get('/:id/analytics', protect, getUrlAnalytics);
router.post('/:id/claim', protect, claimUrl);
router.delete('/:id', protect, deleteUrl);

export default router;
