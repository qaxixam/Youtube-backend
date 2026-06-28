import { Router } from 'express';
import {
  uploadVideo,
  getAllVideos,
  getVideoById,
  updateVideoDetails,
  deleteVideo,
  toggleLikeVideo,
  toggleDislikeVideo,
  incrementViews,
  getSubscribedVideosFeed,
  streamVideo,
} from '../controllers/video.controller.js';
import { verifyJWT, verifyJWTOptional } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Feed & list queries (accessible to anyone, optional auth context)
router.get('/', verifyJWTOptional, getAllVideos);
router.get('/subscriptions-feed', verifyJWT, getSubscribedVideosFeed);

// Video uploads (requires auth and has upload limits)
router.post(
  '/upload',
  verifyJWT,
  uploadLimiter,
  upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnailUrl', maxCount: 1 },
  ]),
  uploadVideo
);

// Video operations
router.get('/v/:videoId', verifyJWTOptional, getVideoById);
router.patch('/v/:videoId', verifyJWT, upload.single('thumbnailUrl'), updateVideoDetails);
router.delete('/v/:videoId', verifyJWT, deleteVideo);

// Video interactions
router.post('/v/:videoId/like', verifyJWT, toggleLikeVideo);
router.post('/v/:videoId/dislike', verifyJWT, toggleDislikeVideo);
router.post('/v/:videoId/view', incrementViews);

// Streaming route (public byte-range streaming endpoint)
router.get('/v/:videoId/stream', streamVideo);

export default router;
