import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../utils/response.js';
import * as campaignService from '../services/campaignService.js';

const router = Router();

const createCampaignSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'slug 仅支持小写字母、数字和连字符'),
  title: z.string().min(1).max(200),
  schema: z.record(z.unknown()).optional(),
});

const updateSchemaBody = z.object({
  schema: z.record(z.unknown()),
});

const publishSchema = z.object({
  rolloutPercent: z.number().int().min(0).max(100).optional(),
});

const rollbackSchema = z.object({
  versionId: z.string().min(1),
});

router.get('/manage/:slug', requireAuth, async (req, res, next) => {
  try {
    const data = await campaignService.getCampaignForManage(req.params.slug);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await campaignService.listCampaigns();
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validate(createCampaignSchema), async (req, res, next) => {
  try {
    const data = await campaignService.createCampaign(req.body);
    ok(res, data, 201);
  } catch (err) {
    next(err);
  }
});

router.put('/:campaignId/schema', requireAuth, validate(updateSchemaBody), async (req, res, next) => {
  try {
    const data = await campaignService.updateCampaignSchema(req.params.campaignId, req.body.schema);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/:campaignId/publish', requireAuth, validate(publishSchema), async (req, res, next) => {
  try {
    const data = await campaignService.publishCampaign(req.params.campaignId, req.body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/:campaignId/unpublish', requireAuth, async (req, res, next) => {
  try {
    const data = await campaignService.unpublishCampaignById(req.params.campaignId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/:campaignId/rollback', requireAuth, validate(rollbackSchema), async (req, res, next) => {
  try {
    const data = await campaignService.rollbackCampaign(req.params.campaignId, req.body.versionId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/:campaignId/versions', requireAuth, async (req, res, next) => {
  try {
    const data = await campaignService.listCampaignVersions(req.params.campaignId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const data = await campaignService.getPublishedCampaignBySlug(req.params.slug, req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
