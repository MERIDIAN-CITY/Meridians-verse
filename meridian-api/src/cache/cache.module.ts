import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

@Module({
    imports: [
        CacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => {
                const ttl = Number(config.get('CACHE_TTL')) || 300;

                if (config.get('CACHE_STORE') === 'redis') {
                    return {
                        store: redisStore,
                        host: config.get('REDIS_HOST'),
                        port: Number(config.get('REDIS_PORT')) || 6379,
                        ttl,
                    };
                }

                // Fallback to default in-memory store
                return {
                    ttl,
                };
            },
        }),
    ],
})
export class AppCacheModule { }
