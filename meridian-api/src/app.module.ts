import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { PostModule } from './post/post.module';
import { TagModule } from './tag/tag.module';
import { MetaoptionModule } from './metaoption/metaoption.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { PaginationModule } from './commom/pagination.module';

import jwtConfig from './auth/config/jwt.config';
import { DataResponseInterceptor } from './commom/interceptor/data-response/data-response.interceptor';
import { AccessTokenGuard } from './auth/guard/access-token/access-token.guard';
import { MailProvider } from './mail/providers/mail.provider';
import { TweetModule } from './tweets/dto/tweet.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    /**
     * GLOBAL ENV CONFIG
     * Local → .env
     * Railway → Railway variables
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    /**
     * RATE LIMITING CONFIG
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    /**
     * DATABASE CONFIG (Railway + Local Compatible)
     */
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');

        // ✅ If Railway provides DATABASE_URL → use it
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: false,
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        // ✅ Local development fallback
        return {
          type: 'postgres',
          host: config.get<string>('POSTGRES_HOST'),
          port: Number(config.get('POSTGRES_PORT')),
          username: config.get<string>('POSTGRES_USER'),
          password: config.get<string>('POSTGRES_PASSWORD'),
          database: config.get<string>('POSTGRES_DB'),
          synchronize: config.get<string>('POSTGRES_SYNC') === 'true',
          autoLoadEntities: config.get<string>('POSTGRES_LOAD') === 'true',
        };
      },
    }),

    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),

    UsersModule,
    PostModule,
    TagModule,
    MetaoptionModule,
    AuthModule,
    MailModule,
    PaginationModule,
    TweetModule,
    UploadModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DataResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AccessTokenGuard,
    MailProvider,
  ],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
