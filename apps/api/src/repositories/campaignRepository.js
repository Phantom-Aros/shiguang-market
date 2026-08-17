import { createHash } from 'node:crypto';
import { query } from '../db/postgres.js';

/**
 * @param {object} row
 */
export function mapCampaignRow(row) {
  return {
    campaignId: row.campaign_id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    publishedVersionId: row.published_version_id,
    canaryVersionId: row.canary_version_id,
    rolloutPercent: row.rollout_percent,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * @param {object} row
 */
export function mapVersionRow(row) {
  return {
    versionId: row.version_id,
    campaignId: row.campaign_id,
    versionNumber: row.version_number,
    schema: row.schema,
    status: row.status,
    publishedAt: row.published_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * 列出所有活动（搭建器用）
 */
export async function listAll() {
  const result = await query(
    `SELECT campaign_id, slug, title, status, published_version_id, canary_version_id,
            rollout_percent, created_at, updated_at
     FROM campaigns
     ORDER BY updated_at DESC`,
  );
  return result.rows;
}

/**
 * @param {string} slug
 */
export async function findBySlug(slug) {
  const result = await query(
    `SELECT campaign_id, slug, title, status, published_version_id, canary_version_id,
            rollout_percent, created_at, updated_at
     FROM campaigns
     WHERE slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} campaignId
 */
export async function findById(campaignId) {
  const result = await query(
    `SELECT campaign_id, slug, title, status, published_version_id, canary_version_id,
            rollout_percent, created_at, updated_at
     FROM campaigns
     WHERE campaign_id = $1`,
    [campaignId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} versionId
 */
export async function findVersionById(versionId) {
  const result = await query(
    `SELECT version_id, campaign_id, version_number, schema, status, published_at, created_at
     FROM campaign_versions
     WHERE version_id = $1`,
    [versionId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} campaignId
 */
export async function listVersions(campaignId) {
  const result = await query(
    `SELECT version_id, campaign_id, version_number, schema, status, published_at, created_at
     FROM campaign_versions
     WHERE campaign_id = $1
     ORDER BY version_number DESC`,
    [campaignId],
  );
  return result.rows;
}

/**
 * @param {string} campaignId
 */
export async function getNextVersionNumber(campaignId) {
  const result = await query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
     FROM campaign_versions
     WHERE campaign_id = $1`,
    [campaignId],
  );
  return result.rows[0].next_version;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ campaignId: string; slug: string; title: string }} input
 */
export async function insertCampaign(client, input) {
  const result = await client.query(
    `INSERT INTO campaigns (campaign_id, slug, title, status)
     VALUES ($1, $2, $3, 'draft')
     RETURNING campaign_id, slug, title, status, published_version_id, canary_version_id,
               rollout_percent, created_at, updated_at`,
    [input.campaignId, input.slug, input.title],
  );
  return result.rows[0];
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ versionId: string; campaignId: string; versionNumber: number; schema: object }} input
 */
export async function insertVersion(client, input) {
  const result = await client.query(
    `INSERT INTO campaign_versions (version_id, campaign_id, version_number, schema, status)
     VALUES ($1, $2, $3, $4, 'draft')
     RETURNING version_id, campaign_id, version_number, schema, status, published_at, created_at`,
    [input.versionId, input.campaignId, input.versionNumber, JSON.stringify(input.schema)],
  );
  return result.rows[0];
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} versionId
 * @param {object} schema
 */
export async function updateVersionSchema(client, versionId, schema) {
  const result = await client.query(
    `UPDATE campaign_versions
     SET schema = $2
     WHERE version_id = $1 AND status = 'draft'
     RETURNING version_id, campaign_id, version_number, schema, status, published_at, created_at`,
    [versionId, JSON.stringify(schema)],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} campaignId
 * @param {string} versionId
 * @param {number} rolloutPercent
 */
export async function publishVersion(client, campaignId, versionId, rolloutPercent = 100) {
  await client.query(
    `UPDATE campaign_versions
     SET status = 'superseded'
     WHERE campaign_id = $1 AND status = 'published' AND version_id != $2`,
    [campaignId, versionId],
  );

  await client.query(
    `UPDATE campaign_versions
     SET status = 'published', published_at = NOW()
     WHERE version_id = $1`,
    [versionId],
  );

  if (rolloutPercent >= 100) {
    const result = await client.query(
      `UPDATE campaigns
       SET status = 'published',
           published_version_id = $2,
           canary_version_id = NULL,
           rollout_percent = 100,
           updated_at = NOW()
       WHERE campaign_id = $1
       RETURNING campaign_id, slug, title, status, published_version_id, canary_version_id,
                 rollout_percent, created_at, updated_at`,
      [campaignId, versionId],
    );
    return result.rows[0];
  }

  const result = await client.query(
    `UPDATE campaigns
     SET status = 'published',
         canary_version_id = $2,
         rollout_percent = $3,
         updated_at = NOW()
     WHERE campaign_id = $1
     RETURNING campaign_id, slug, title, status, published_version_id, canary_version_id,
               rollout_percent, created_at, updated_at`,
    [campaignId, versionId, rolloutPercent],
  );
  return result.rows[0];
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} campaignId
 * @param {string} targetVersionId
 */
export async function rollbackToVersion(client, campaignId, targetVersionId) {
  await client.query(
    `UPDATE campaign_versions
     SET status = 'superseded'
     WHERE campaign_id = $1 AND status = 'published'`,
    [campaignId],
  );

  await client.query(
    `UPDATE campaign_versions
     SET status = 'published', published_at = NOW()
     WHERE version_id = $1`,
    [targetVersionId],
  );

  const result = await client.query(
    `UPDATE campaigns
     SET published_version_id = $2,
         canary_version_id = NULL,
         rollout_percent = 100,
         status = 'published',
         updated_at = NOW()
     WHERE campaign_id = $1
     RETURNING campaign_id, slug, title, status, published_version_id, canary_version_id,
               rollout_percent, created_at, updated_at`,
    [campaignId, targetVersionId],
  );
  return result.rows[0];
}

/**
 * @param {string} campaignId
 */
export async function getLatestDraftVersion(campaignId) {
  const result = await query(
    `SELECT version_id, campaign_id, version_number, schema, status, published_at, created_at
     FROM campaign_versions
     WHERE campaign_id = $1 AND status = 'draft'
     ORDER BY version_number DESC
     LIMIT 1`,
    [campaignId],
  );
  return result.rows[0] ?? null;
}

/**
 * 根据 userId 哈希决定灰度版本
 * @param {string | null | undefined} userId
 * @param {number} rolloutPercent
 */
export function shouldUseCanary(userId, rolloutPercent) {
  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0) return false;
  if (!userId) return false;

  const hash = createHash('sha256').update(userId).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket < rolloutPercent;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} campaignId
 */
export async function unpublishCampaign(client, campaignId) {
  const result = await client.query(
    `UPDATE campaigns
     SET status = 'draft',
         canary_version_id = NULL,
         rollout_percent = 0,
         updated_at = NOW()
     WHERE campaign_id = $1
     RETURNING campaign_id, slug, title, status, published_version_id, canary_version_id,
               rollout_percent, created_at, updated_at`,
    [campaignId],
  );
  return result.rows[0];
}

/**
 * @param {string} campaignId
 * @param {string | null} publishedVersionId
 */
export async function getEditingVersion(campaignId, publishedVersionId) {
  const draft = await getLatestDraftVersion(campaignId);
  if (draft) return draft;

  if (publishedVersionId) {
    const published = await findVersionById(publishedVersionId);
    if (published) return published;
  }

  const versions = await listVersions(campaignId);
  return versions[0] ?? null;
}
