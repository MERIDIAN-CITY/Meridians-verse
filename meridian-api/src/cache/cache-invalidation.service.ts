import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  private postCacheKeys: Set<string> = new Set();
  private userCacheKeys: Set<string> = new Set();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  trackPostCacheKey(key: string) {
    this.postCacheKeys.add(key);
  }

  trackUserCacheKey(key: string) {
    this.userCacheKeys.add(key);
  }

  async invalidatePostCache() {
    const keys = Array.from(this.postCacheKeys);
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
    this.postCacheKeys.clear();
  }

  async invalidateUserCache() {
    const keys = Array.from(this.userCacheKeys);
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
    this.userCacheKeys.clear();
  }

  async del(key: string) {
    await this.cacheManager.del(key);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number) {
    if (ttl) {
      await this.cacheManager.set(key, value, ttl);
    } else {
      await this.cacheManager.set(key, value);
    }
  }
}
