import { existsSync } from 'fs';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from '../auth/auth.module.js';
import { BlockModule } from '../block/block.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { DrizzleModule } from '../drizzle/drizzle.module.js';
import { FriendModule } from '../friend/friend.module.js';
import { GameModule } from '../game/game.module.js';
import { HealthModule } from '../health/health.module.js';
import { ReplayModule } from '../replay/replay.module.js';
import { ReportModule } from '../report/report.module.js';
import { StatsModule } from '../stats/stats.module.js';
import { SummaryModule } from '../summary/summary.module.js';
import { UserModule } from '../user/user.module.js';
import { WsModule } from '../ws/ws.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConditionalThrottlerGuard } from './conditional-throttler.guard.js';

const staticPath = join(process.cwd(), 'public');

// Loaded only when public/ exists (i.e. inside the Docker image), to avoid
// side-effects from the import during local development. Top-level await is
// what lets this stay conditional now that require() is gone.
const serveStaticImports = existsSync(staticPath)
  ? [
      (await import('@nestjs/serve-static')).ServeStaticModule.forRoot({
        rootPath: staticPath,
        exclude: ['/api/(.*)'],
        serveStaticOptions: {
          // With Fastify, fallthrough must be true so that non-file routes
          // fall back to serving index.html (SPA client-side routing support).
          // Without this, reloading a page like /rooms/5 returns 404.
          fallthrough: true,
        },
      }),
    ]
  : [];

@Module({
  imports: [
    ...serveStaticImports,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        AUTH_STRATEGIES: Joi.string()
          .default('basic')
          .custom((value: string, helpers) => {
            const strategies = value.split(',').map((s: string) => s.trim());
            const valid = ['basic', 'oidc'];
            for (const s of strategies) {
              if (!valid.includes(s)) {
                return helpers.error('any.invalid');
              }
            }
            if (new Set(strategies).size !== strategies.length) {
              return helpers.error('any.invalid');
            }
            return value;
          }, 'comma-separated auth strategies'),
        OIDC_ISSUER: Joi.string()
          .uri()
          .when('AUTH_STRATEGIES', {
            is: Joi.string().pattern(/oidc/),
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        OIDC_CLIENT_ID: Joi.string().when('AUTH_STRATEGIES', {
          is: Joi.string().pattern(/oidc/),
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        OIDC_CLIENT_SECRET: Joi.string().when('AUTH_STRATEGIES', {
          is: Joi.string().pattern(/oidc/),
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        OIDC_REDIRECT_URI: Joi.string()
          .uri()
          .when('AUTH_STRATEGIES', {
            is: Joi.string().pattern(/oidc/),
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', 'info'),
          transport:
            config.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          redact: ['req.headers.authorization'],
        },
      }),
    }),
    DrizzleModule,
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    HealthModule,
    AuthModule,
    BlockModule,
    UserModule,
    FriendModule,
    WsModule,
    ChatModule,
    GameModule,
    ReplayModule,
    ReportModule,
    StatsModule,
    SummaryModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ConditionalThrottlerGuard }],
})
export class AppModule {}
