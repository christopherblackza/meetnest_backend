import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as crypto from 'crypto';
import { AppModule } from './app.module';
import './firebase/firebase-admin';

// Polyfill for environments where global.crypto is not available (Node < 19)
if (!global.crypto) {
  try {
    // @ts-ignore
    global.crypto = crypto.webcrypto;
  } catch (e) {
    console.error('Failed to polyfill Web Crypto API:', e);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable CORS for your Angular app
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:4201',
      'http://127.0.0.1:4201',
      'https://admin.meetro.app',
    ], // Angular dev server URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     transform: true, // 👈 MUST be enabled for @Type to work
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //   }),
  // );

  const logger = new Logger('Bootstrap');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Notifications Service API')
    .setDescription('API for managing push notifications')
    .setVersion('1.0')
    .addTag('notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  logger.log(`Starting server on port ${port}`);

  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
