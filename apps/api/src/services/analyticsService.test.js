import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as analyticsRepository from '../repositories/analyticsRepository.js';
import { ingestEvents } from '../services/analyticsService.js';

vi.mock('../repositories/analyticsRepository.js', () => ({
  insertEvents: vi.fn().mockResolvedValue(undefined),
}));

describe('analyticsService.ingestEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('异步落库且不阻塞响应', async () => {
    const req = {
      userId: 'user-1',
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-agent'),
    };

    ingestEvents(req, [
      { event: 'feed_click', properties: { postId: 'post-1', sessionId: 'sess-1' } },
    ]);

    await new Promise((resolve) => setImmediate(resolve));

    expect(analyticsRepository.insertEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'user-1',
        sessionId: 'sess-1',
        eventName: 'feed_click',
        properties: { postId: 'post-1' },
      }),
    ]);
  });
});
