import { Router } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getUserChannelProfile,
  toggleSubscribe,
  getSubscribedChannels,
  getWatchHistory,
} from '../controllers/user.controller.js';
import { verifyJWT, verifyJWTOptional } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Unsecured / Auth routes
router.post(
  '/register',
  authLimiter,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  registerUser
);
router.post('/login', authLimiter, loginUser);

// Secured routes
router.post('/logout', verifyJWT, logoutUser);
router.get('/me', verifyJWT, getCurrentUser);
router.get('/c/:username', verifyJWTOptional, getUserChannelProfile);
router.post('/subscribe/:channelId', verifyJWT, toggleSubscribe);
router.get('/subscriptions', verifyJWT, getSubscribedChannels);
router.get('/history', verifyJWT, getWatchHistory);

export default router;
