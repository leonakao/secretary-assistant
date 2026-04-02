import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { initializeLangWatchObservability } from './observability/langwatch';

async function bootstrap() {
  initializeLangWatchObservability();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = Number(process.env.PORT?.trim() || '3000');
  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT?.trim() || '25mb';
  const allowedOrigins = (
    process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173']
  )
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableShutdownHooks();
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  app.useBodyParser('json', { limit: requestBodyLimit });
  app.useBodyParser('urlencoded', {
    limit: requestBodyLimit,
    extended: true,
  });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
}

bootstrap().catch((e) => console.error(e));
