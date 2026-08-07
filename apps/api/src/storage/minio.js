import * as Minio from 'minio';
import { env } from '../env.js';

const client = new Minio.Client({
  endPoint: env.minioEndpoint,
  port: env.minioPort,
  useSSL: env.minioUseSsl,
  accessKey: env.minioAccessKey,
  secretKey: env.minioSecretKey,
});

let bucketReady = false;

export async function ensureBucket() {
  if (bucketReady) return;

  const exists = await client.bucketExists(env.minioBucket);
  if (!exists) {
    await client.makeBucket(env.minioBucket);
  }

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${env.minioBucket}/*`],
      },
    ],
  };

  try {
    await client.setBucketPolicy(env.minioBucket, JSON.stringify(policy));
  } catch {
    // 开发环境策略设置失败不阻塞启动
  }

  bucketReady = true;
}

/**
 * @param {string} objectKey
 * @param {Buffer} buffer
 * @param {string} contentType
 */
export async function uploadObject(objectKey, buffer, contentType) {
  await ensureBucket();
  await client.putObject(env.minioBucket, objectKey, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return getPublicUrl(objectKey);
}

/** @param {string} objectKey */
export function getPublicUrl(objectKey) {
  const protocol = env.minioUseSsl ? 'https' : 'http';
  return `${protocol}://${env.minioEndpoint}:${env.minioPort}/${env.minioBucket}/${objectKey}`;
}
