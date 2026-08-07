import { ulid } from 'ulid';
import { extname } from 'node:path';
import { AppError } from '../middleware/errorHandler.js';
import { uploadObject } from '../storage/minio.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024;

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * @param {{ buffer: Buffer, mimetype: string, size: number, originalname: string }} file
 */
export async function uploadImage(file) {
  if (!file) {
    throw new AppError('请选择要上传的图片', 'VALIDATION_ERROR', 400);
  }

  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AppError('仅支持 JPEG、PNG、WebP、GIF 格式', 'VALIDATION_ERROR', 400);
  }

  if (file.size > MAX_SIZE) {
    throw new AppError('图片大小不能超过 5MB', 'VALIDATION_ERROR', 400);
  }

  const ext = extname(file.originalname) || EXT_BY_MIME[file.mimetype] || '.jpg';
  const objectKey = `images/${ulid()}${ext}`;
  const url = await uploadObject(objectKey, file.buffer, file.mimetype);

  return {
    url,
    objectKey,
    mimeType: file.mimetype,
    size: file.size,
  };
}
