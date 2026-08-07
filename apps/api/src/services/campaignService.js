import { ulid } from 'ulid';
import { AppError } from '../middleware/errorHandler.js';
import { withTransaction } from '../db/postgres.js';
import { validateCampaignPageSchema } from '@shiguang/campaign-schema/schema';
import * as campaignRepository from '../repositories/campaignRepository.js';

/**
 * @param {{ slug: string; title: string; schema?: object }} input
 */
export async function createCampaign(input) {
  const existing = await campaignRepository.findBySlug(input.slug);
  if (existing) {
    throw new AppError(`活动 slug「${input.slug}」已存在`, 'VALIDATION_ERROR', 400);
  }

  const schema = input.schema ?? {
    title: input.title,
    blocks: [
      {
        id: 'placeholder-1',
        type: 'richText',
        props: { content: '在此编辑活动内容…' },
      },
    ],
  };
  const validation = validateCampaignPageSchema(schema);
  if (!validation.success) {
    throw new AppError(validation.message, 'VALIDATION_ERROR', 400);
  }

  const campaignId = ulid();
  const versionId = ulid();

  return withTransaction(async (client) => {
    const campaign = await campaignRepository.insertCampaign(client, {
      campaignId,
      slug: input.slug,
      title: input.title,
    });

    const version = await campaignRepository.insertVersion(client, {
      versionId,
      campaignId,
      versionNumber: 1,
      schema: validation.data,
    });

    return {
      ...campaignRepository.mapCampaignRow(campaign),
      latestVersion: campaignRepository.mapVersionRow(version),
    };
  });
}

/**
 * @param {string} campaignId
 * @param {object} schema
 */
export async function updateCampaignSchema(campaignId, schema) {
  const campaign = await campaignRepository.findById(campaignId);
  if (!campaign) {
    throw new AppError('活动不存在', 'NOT_FOUND', 404);
  }

  const validation = validateCampaignPageSchema(schema);
  if (!validation.success) {
    throw new AppError(validation.message, 'VALIDATION_ERROR', 400);
  }

  const draft = await campaignRepository.getLatestDraftVersion(campaignId);

  return withTransaction(async (client) => {
    if (draft) {
      const updated = await campaignRepository.updateVersionSchema(
        client,
        draft.version_id,
        validation.data,
      );
      if (updated) {
        return campaignRepository.mapVersionRow(updated);
      }
    }

    const versionNumber = await campaignRepository.getNextVersionNumber(campaignId);
    const version = await campaignRepository.insertVersion(client, {
      versionId: ulid(),
      campaignId,
      versionNumber,
      schema: validation.data,
    });
    return campaignRepository.mapVersionRow(version);
  });
}

/**
 * @param {string} campaignId
 * @param {{ rolloutPercent?: number }} options
 */
export async function publishCampaign(campaignId, options = {}) {
  const campaign = await campaignRepository.findById(campaignId);
  if (!campaign) {
    throw new AppError('活动不存在', 'NOT_FOUND', 404);
  }

  const draft = await campaignRepository.getLatestDraftVersion(campaignId);
  if (!draft) {
    throw new AppError('没有可发布的草稿版本', 'VALIDATION_ERROR', 400);
  }

  const validation = validateCampaignPageSchema(draft.schema);
  if (!validation.success) {
    throw new AppError(`发布前校验失败：${validation.message}`, 'VALIDATION_ERROR', 400);
  }

  const rolloutPercent = options.rolloutPercent ?? 100;
  if (rolloutPercent < 0 || rolloutPercent > 100) {
    throw new AppError('rolloutPercent 必须在 0-100 之间', 'VALIDATION_ERROR', 400);
  }

  return withTransaction(async (client) => {
    const updated = await campaignRepository.publishVersion(
      client,
      campaignId,
      draft.version_id,
      rolloutPercent,
    );
    const version = await campaignRepository.findVersionById(draft.version_id);
    return {
      campaign: campaignRepository.mapCampaignRow(updated),
      publishedVersion: campaignRepository.mapVersionRow(version),
    };
  });
}

/**
 * @param {string} campaignId
 * @param {string} versionId
 */
export async function rollbackCampaign(campaignId, versionId) {
  const campaign = await campaignRepository.findById(campaignId);
  if (!campaign) {
    throw new AppError('活动不存在', 'NOT_FOUND', 404);
  }

  const version = await campaignRepository.findVersionById(versionId);
  if (!version || version.campaign_id !== campaignId) {
    throw new AppError('版本不存在', 'NOT_FOUND', 404);
  }

  return withTransaction(async (client) => {
    const updated = await campaignRepository.rollbackToVersion(client, campaignId, versionId);
    const rolledBack = await campaignRepository.findVersionById(versionId);
    return {
      campaign: campaignRepository.mapCampaignRow(updated),
      publishedVersion: campaignRepository.mapVersionRow(rolledBack),
    };
  });
}

/**
 * @param {string} campaignId
 */
export async function listCampaignVersions(campaignId) {
  const campaign = await campaignRepository.findById(campaignId);
  if (!campaign) {
    throw new AppError('活动不存在', 'NOT_FOUND', 404);
  }

  const versions = await campaignRepository.listVersions(campaignId);
  return {
    campaign: campaignRepository.mapCampaignRow(campaign),
    versions: versions.map(campaignRepository.mapVersionRow),
  };
}

/**
 * @param {string} slug
 * @param {string | undefined} userId
 */
export async function getPublishedCampaignBySlug(slug, userId) {
  const campaign = await campaignRepository.findBySlug(slug);
  if (!campaign || campaign.status !== 'published') {
    throw new AppError('活动不存在或未发布', 'NOT_FOUND', 404);
  }

  let versionId = campaign.published_version_id;

  if (
    campaign.canary_version_id &&
    campaign.rollout_percent < 100 &&
    campaignRepository.shouldUseCanary(userId, campaign.rollout_percent)
  ) {
    versionId = campaign.canary_version_id;
  }

  if (!versionId) {
    throw new AppError('活动暂无已发布版本', 'NOT_FOUND', 404);
  }

  const version = await campaignRepository.findVersionById(versionId);
  if (!version) {
    throw new AppError('活动版本不存在', 'NOT_FOUND', 404);
  }

  return {
    campaignId: campaign.campaign_id,
    slug: campaign.slug,
    title: campaign.title,
    versionId: version.version_id,
    versionNumber: version.version_number,
    schema: version.schema,
    publishedAt: version.published_at?.toISOString() ?? null,
  };
}
