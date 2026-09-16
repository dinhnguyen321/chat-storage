import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path';
async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  // Serve thư mục uploads công khai
  app.useStaticAssets(join(process.cwd(), 'upload'), {
    prefix: '/uploads',
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field thừa không được định nghĩa trong DTO
      transform: true, // Tự động chuyển đổi kiểu dữ liệu (ví dụ chuỗi số thành kiểu number)
      forbidNonWhitelisted: true, // Từ chối các request có field thừa
    }),
  );

  // Enable CORS with secure configurations
  app.enableCors({
    origin: ['http://localhost:3005', 'http://localhost:8080'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', 
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true, // Allow cookies or authorization headers
  })
  
  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Chat Storage')
    .setDescription('Chat Storage DB')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập access token',
      },
      'access-token',
    ).build();
    const document = SwaggerModule.createDocument(app, config); 
     
    SwaggerModule.setup('api', app, document)
  if (!process.env.VITE) {
    await app.listen(process.env.PORT ?? 3001);
    console.log(`Application is running on: ${await app.getUrl()}`);
  }
  return app;
}
export const chatStorage = bootstrap();
