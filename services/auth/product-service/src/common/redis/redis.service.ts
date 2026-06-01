import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = this.configService.get('redis');
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      lazyConnect: true,
    });
    await this.redis.connect();
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    const json = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, json);
    } else {
      await this.redis.set(key, json);
    }
  }
}
