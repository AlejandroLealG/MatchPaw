import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // ── Global exception filter ──────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  console.log(`MatchPaw API corriendo en http://localhost:${port}`);
}

void bootstrap();
