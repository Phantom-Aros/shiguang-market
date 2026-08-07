import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { ok } from '../utils/response.js';
import * as postService from '../services/postService.js';

const router = Router();

router.get('/:postId/related', optionalAuth, async (req, res, next) => {
  try {
    const data = await postService.getRelatedPosts(req.params.postId, req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/:postId', optionalAuth, async (req, res, next) => {
  try {
    const data = await postService.getPostDetail(req.params.postId, req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/:postId/like', requireAuth, async (req, res, next) => {
  try {
    const data = await postService.likePost(req.params.postId, req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.delete('/:postId/like', requireAuth, async (req, res, next) => {
  try {
    const data = await postService.unlikePost(req.params.postId, req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/:postId/favorite', requireAuth, async (req, res, next) => {
  try {
    const data = await postService.favoritePost(req.params.postId, req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.delete('/:postId/favorite', requireAuth, async (req, res, next) => {
  try {
    const data = await postService.unfavoritePost(req.params.postId, req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
