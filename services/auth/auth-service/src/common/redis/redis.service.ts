import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      password: this.configService.get('redis.password'),
      lazyConnect: true,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async setJson(key: string, value: object, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  // JWT Blacklist
  async blacklistToken(jwtId: string, ttlSeconds: number): Promise<void> {
    await this.set(`blacklist:${jwtId}`, '1', ttlSeconds);
  }

  async isTokenBlacklisted(jwtId: string): Promise<boolean> {
    return this.exists(`blacklist:${jwtId}`);
  }

  // MFA OTP
  async setMfaOtp(userId: string, otp: string, ttlSeconds = 300): Promise<void> {
    await this.set(`mfa:${userId}`, otp, ttlSeconds);
  }

  async getMfaOtp(userId: string): Promise<string | null> {
    return this.get(`mfa:${userId}`);
  }

  async deleteMfaOtp(userId: string): Promise<void> {
    await this.del(`mfa:${userId}`);
  }

  // OAuth state
  async setOAuthState(state: string, data: object, ttlSeconds = 600): Promise<void> {
    await this.setJson(`oauth:state:${state}`, data, ttlSeconds);
  }

  async getOAuthState<T>(state: string): Promise<T | null> {
    return this.getJson<T>(`oauth:state:${state}`);
  }
}
