import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as campaignRepository from '../repositories/campaignRepository.js';
import { shouldUseCanary } from '../repositories/campaignRepository.js';
import * as campaignService from '../services/campaignService.js';

vi.mock('../repositories/campaignRepository.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    findBySlug: vi.fn(),
    findById: vi.fn(),
    findVersionById: vi.fn(),
  };
});

vi.mock('../db/postgres.js', () => ({
  withTransaction: (fn) => fn({ query: vi.fn() }),
}));

describe('campaignService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPublishedCampaignBySlug', () => {
    it('returns canary version when rollout is 100%', async () => {
      vi.mocked(campaignRepository.findBySlug).mockResolvedValue({
        campaign_id: 'camp1',
        slug: '618-sale',
        title: '618',
        status: 'published',
        published_version_id: 'v1',
        canary_version_id: 'v2',
        rollout_percent: 100,
      });

      vi.mocked(campaignRepository.findVersionById).mockResolvedValue({
        version_id: 'v2',
        campaign_id: 'camp1',
        version_number: 2,
        schema: { title: '618', blocks: [] },
        status: 'published',
        published_at: new Date(),
      });

      const result = await campaignService.getPublishedCampaignBySlug('618-sale', 'user123');
      expect(result.versionId).toBe('v2');
    });

    it('throws when campaign not published', async () => {
      vi.mocked(campaignRepository.findBySlug).mockResolvedValue(null);
      await expect(campaignService.getPublishedCampaignBySlug('missing')).rejects.toThrow('活动不存在或未发布');
    });
  });

  describe('unpublishCampaignById', () => {
    it('throws when campaign is not published', async () => {
      vi.mocked(campaignRepository.findById).mockResolvedValue({
        campaign_id: 'camp1',
        slug: '618-sale',
        title: '618',
        status: 'draft',
        published_version_id: null,
        canary_version_id: null,
        rollout_percent: 0,
      });

      await expect(campaignService.unpublishCampaignById('camp1')).rejects.toThrow('活动未发布，无需下线');
    });
  });
});

describe('shouldUseCanary', () => {
  it('returns true at 100% rollout', () => {
    expect(shouldUseCanary('user1', 100)).toBe(true);
  });

  it('returns false without userId', () => {
    expect(shouldUseCanary(null, 50)).toBe(false);
  });

  it('is deterministic for same user', () => {
    const a = shouldUseCanary('user-abc', 50);
    const b = shouldUseCanary('user-abc', 50);
    expect(a).toBe(b);
  });
});
