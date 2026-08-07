import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage } from '../services/uploadService.js';
import { ok } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError('仅支持 JPEG、PNG、WebP、GIF 格式', 'VALIDATION_ERROR', 400));
    }
    cb(null, true);
  },
});

router.post('/images', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const data = await uploadImage(req.file);
    return ok(res, data, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
