#!/usr/bin/env node
/**
 * Feed 接口压测脚本（autocannon）。
 *
 * 用法：
 *   npm --workspace=api run benchmark:feed
 *   BASE_URL=http://localhost:3000 DURATION=10 npm --workspace=api run benchmark:feed
 */
import autocannon from 'autocannon';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const duration = Number(process.env.DURATION ?? 10);
const connections = Number(process.env.CONNECTIONS ?? 20);
const url = `${baseUrl}/api/feed?limit=20`;

console.log(`压测目标: ${url}`);
console.log(`并发: ${connections}, 时长: ${duration}s\n`);

const result = await autocannon({
  url,
  connections,
  duration,
  headers: {
    accept: 'application/json',
  },
});

autocannon.printResult(result);

const summary = {
  url,
  connections,
  durationSec: duration,
  requests: result.requests,
  throughput: result.throughput,
  latency: result.latency,
  errors: result.errors,
  non2xx: result.non2xx,
  timeouts: result.timeouts,
};

console.log('\n=== JSON Summary ===');
console.log(JSON.stringify(summary, null, 2));
