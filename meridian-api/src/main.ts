import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataResponseInterceptor } from './commom/interceptor/data-response/data-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Meridian API') // Add a title
    .setDescription(
      'Productivity-powered on-chain economy built on the Stellar blockchain.',
    ) // Add a description
    .setTermsOfService('http://localhost:3000/terms of service')
    .setVersion('1.0') // Set the API version
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Serve Swagger at '/api'

  //making intwerceptor global
  app.useGlobalInterceptors(new DataResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
