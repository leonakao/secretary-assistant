import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { initializeLangWatchObservability } from './observability/langwatch';

async function bootstrap() {
  initializeLangWatchObservability();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT?.trim() || '25mb';

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

  await app.listen(3000);
}

bootstrap().catch((e) => console.error(e));
