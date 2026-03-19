import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { RefugiosModule } from './modules/refugios/refugios.module';
import { AnimalesModule } from './modules/animales/animales.module';
import { SolicitudesModule } from './modules/solicitudes/solicitudes.module';
import { DonacionesModule } from './modules/donaciones/donaciones.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // ── Environment variables ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── MongoDB ────────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/matchpaw'),
      }),
      inject: [ConfigService],
    }),

    // ── Redis / BullMQ ─────────────────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // ── Static files (/uploads) ────────────────────────────────────────────
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          rootPath: path.resolve(config.get<string>('UPLOADS_DIR', './uploads')),
          serveRoot: '/uploads',
          serveStaticOptions: { index: false },
        },
      ],
      inject: [ConfigService],
    }),

    // ── Domain modules ─────────────────────────────────────────────────────
    StorageModule,
    AuthModule,
    RefugiosModule,
    AnimalesModule,
    SolicitudesModule,
    DonacionesModule,
    NotificacionesModule,
    AdminModule,
  ],
})
export class AppModule {}
