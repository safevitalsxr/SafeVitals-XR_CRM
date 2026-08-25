import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // Add Helmet for HTTP security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Managed separately per-route; Swagger needs inline styles
    crossOriginEmbedderPolicy: false,
  }));

  // Enable graceful shutdown hooks for container lifecycle
  app.enableShutdownHooks();

  app.use(cookieParser());

  // Configure CORS
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS');
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const origins = allowedOrigins
    ? allowedOrigins.split(',').map((o) => o.trim())
    : frontendUrl
    ? [frontendUrl]
    : true; // In dev, allow all if not set

  app.enableCors({
    origin: origins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-request-id', 'X-Requested-With'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Safe Vitals XR API')
      .setDescription('Production-grade Mobile & Web Backend for Safe Vitals Workforce Management Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Health', 'System health, liveness and readiness probes')
      .addTag('Mobile', 'Mobile-optimized aggregated APIs and endpoints')
      .addTag('Auth', 'Authentication and session management')
      .addTag('Employees', 'Workforce and employee records')
      .addTag('Attendance', 'Mobile clock-in, break tracking, and GPS geofencing')
      .addTag('Leave', 'Leave requests and approvals')
      .addTag('Tasks', 'Task allocation and tracking')
      .addTag('Tickets', 'Support ticket resolution')
      .addTag('Notifications', 'Mobile push alerts and system notifications')
      .build();

  const customSwaggerCss = `
    @viewport { width: device-width; zoom: 1.0; }
    html { box-sizing: border-box; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .swagger-ui .topbar { background-color: #111827; border-bottom: 1px solid #1f2937; padding: 12px 16px; }
    .swagger-ui .topbar a { max-width: 250px; }
    .swagger-ui { color: #e5e7eb; max-width: 1200px; margin: 0 auto; padding: 0 12px; }
    .swagger-ui .info { margin: 24px 0; }
    .swagger-ui .info .title { color: #f9fafb; font-size: 26px; }
    .swagger-ui .opblock { border-radius: 10px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .swagger-ui .opblock .opblock-summary { padding: 12px 14px; min-height: 48px; }
    .swagger-ui .opblock .opblock-summary-method { border-radius: 6px; font-weight: 700; min-width: 70px; text-align: center; }
    .swagger-ui .btn { border-radius: 6px; padding: 8px 14px; touch-action: manipulation; }
    .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui select, .swagger-ui textarea { border-radius: 6px; font-size: 14px; padding: 8px; }
    @media (max-width: 640px) {
      .swagger-ui .opblock .opblock-summary { flex-wrap: wrap; gap: 8px; }
      .swagger-ui .opblock .opblock-summary-path { max-width: 100%; word-break: break-all; font-size: 13px; }
      .swagger-ui .opblock-summary-description { width: 100%; margin-top: 4px; font-size: 12px; }
      .swagger-ui .info .title { font-size: 20px; }
      .swagger-ui .wrapper { padding: 0 4px; }
    }
  `;

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customCss: customSwaggerCss,
      customSiteTitle: 'Safe Vitals XR API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
      },
    });
  } else {
    logger.log('🔒 Swagger disabled in production mode');
  }

  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT') || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Safe Vitals XR Backend running on http://0.0.0.0:${port}`);
  if (!isProduction) {
    logger.log(`📄 Swagger docs: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
