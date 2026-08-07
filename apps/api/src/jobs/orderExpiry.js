import { Queue, Worker } from 'bullmq';
import { env } from '../env.js';
import { logger } from '../logger.js';
import * as orderService from '../services/orderService.js';

const log = logger.child({ name: 'orderExpiry' });

const QUEUE_NAME = 'order-expiry';
const EXPIRY_DELAY_MS = 30 * 60 * 1000;

const connection = {
  url: env.redisUrl,
};

/** @type {Queue | null} */
let queue = null;

/** @type {Worker | null} */
let worker = null;

function getQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection });
  }
  return queue;
}

/**
 * @param {string} orderId
 */
export async function cancelOrderExpiry(orderId) {
  const job = await getQueue().getJob(`order-expiry-${orderId}`);
  if (job) {
    await job.remove();
  }
}

/**
 * @param {string} orderId
 */
export async function scheduleOrderExpiry(orderId) {
  await getQueue().add(
    'expire',
    { orderId },
    {
      jobId: `order-expiry-${orderId}`,
      delay: EXPIRY_DELAY_MS,
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

export function startOrderExpiryWorker() {
  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { orderId } = job.data;
      await orderService.cancelExpiredOrder(orderId);
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    log.error(
      { err, jobId: job?.id, orderId: job?.data?.orderId },
      'order expiry job failed',
    );
  });

  return worker;
}

export async function closeOrderExpiry() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
