import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security headers ────────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: false })); // CSP off so Swagger UI loads

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // ── Global validation pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: false,
      transform:            true,
      stopAtFirstError:     false,
      errorHttpStatusCode:  422,
    }),
  );

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────
  const doc = new DocumentBuilder()
    .setTitle('FishThunder API')
    .setDescription(
      'REST API for FishThunder – Admin Panel + Unity Game Backend.\n\n' +
      '## Authentication\n' +
      'Use `POST /api/login` to obtain a bearer token, then click **Authorize** and paste it.\n\n' +
      '## Role Hierarchy\n' +
      '`Admin (1) → Agent (2) → Distributor (3) → Manager (4) → Cashier (5) → Player (6)`\n\n' +
      'Every user can only manage their own descendants in the hierarchy.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addTag('Auth',         'Registration, login, password reset')
    .addTag('Users',        'User CRUD, block/unblock, mass-create')
    .addTag('Wallet',       'Balance query and credit/debit operations')
    .addTag('Transactions', 'Immutable transaction ledger')
    .addTag('Admin',        'Admin-only stats and reports')
    .build();

  const document = SwaggerModule.createDocument(app, doc);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`FishThunder API  → http://localhost:${port}`);
  console.log(`Swagger Docs     → http://localhost:${port}/api/docs`);
}

bootstrap();
