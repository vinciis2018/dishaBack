import 'dotenv/config';
import IORedis from 'ioredis';

export const connection = process.env.REDIS_URL ? process.env.REDIS_URL
  : {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };


export const redis = new IORedis(connection);