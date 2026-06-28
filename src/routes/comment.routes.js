import { Router } from 'express';
import {
  getVideoComments,
  addComment,
  deleteComment,
  toggleLikeComment,
} from '../controllers/comment.controller.js';
import { verifyJWT, verifyJWTOptional } from '../middlewares/auth.middleware.js';

const router = Router();

// Comment fetch & write under a video
router.get('/v/:videoId', verifyJWTOptional, getVideoComments);
router.post('/v/:videoId', verifyJWT, addComment);

// Comment modification
router.delete('/c/:commentId', verifyJWT, deleteComment);
router.post('/c/:commentId/like', verifyJWT, toggleLikeComment);

export default router;
