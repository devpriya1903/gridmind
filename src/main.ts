import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // remove extra fields from the request body
    forbidNonWhitelisted: true, // throw an error if extra fields are sent
    transform: true, // transform the request body to the DTO type
  }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
