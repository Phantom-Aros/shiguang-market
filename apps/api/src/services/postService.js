import { AppError } from '../middleware/errorHandler.js';
import * as interactionRepository from '../repositories/interactionRepository.js';
import * as postRepository from '../repositories/postRepository.js';

/**
 * @param {string} postId
 * @param {string | undefined} userId
 */
export async function getPostDetail(postId, userId) {
  const row = await postRepository.findById(postId, userId);
  if (!row) {
    throw new AppError('帖子不存在', 'NOT_FOUND', 404);
  }

  await postRepository.incrementViewCount(postId);

  const [media, products] = await Promise.all([
    postRepository.findMediaByPostId(postId),
    postRepository.findProductsByPostId(postId),
  ]);

  return {
    ...postRepository.mapPostDetailRow({
      ...row,
      view_count: row.view_count + 1,
    }),
    media,
    products,
  };
}

/**
 * @param {string} postId
 * @param {string} userId
 */
export async function likePost(postId, userId) {
  await ensurePostExists(postId);
  await interactionRepository.likePost(userId, postId);
  const counts = await interactionRepository.getCounts(postId);
  return {
    isLiked: true,
    likeCount: counts?.like_count ?? 0,
  };
}

/**
 * @param {string} postId
 * @param {string} userId
 */
export async function unlikePost(postId, userId) {
  await ensurePostExists(postId);
  await interactionRepository.unlikePost(userId, postId);
  const counts = await interactionRepository.getCounts(postId);
  return {
    isLiked: false,
    likeCount: counts?.like_count ?? 0,
  };
}

/**
 * @param {string} postId
 * @param {string} userId
 */
export async function favoritePost(postId, userId) {
  await ensurePostExists(postId);
  await interactionRepository.favoritePost(userId, postId);
  const counts = await interactionRepository.getCounts(postId);
  return {
    isFavorited: true,
    favoriteCount: counts?.favorite_count ?? 0,
  };
}

/**
 * @param {string} postId
 * @param {string} userId
 */
export async function unfavoritePost(postId, userId) {
  await ensurePostExists(postId);
  await interactionRepository.unfavoritePost(userId, postId);
  const counts = await interactionRepository.getCounts(postId);
  return {
    isFavorited: false,
    favoriteCount: counts?.favorite_count ?? 0,
  };
}

/**
 * @param {string} postId
 * @param {string | undefined} userId
 */
export async function getRelatedPosts(postId, userId) {
  await ensurePostExists(postId);
  const rows = await postRepository.findRelated(postId, userId, 6);
  return {
    items: rows.map(postRepository.mapFeedRow),
  };
}

/**
 * @param {string} postId
 */
async function ensurePostExists(postId) {
  const row = await postRepository.findById(postId);
  if (!row) {
    throw new AppError('帖子不存在', 'NOT_FOUND', 404);
  }
}
