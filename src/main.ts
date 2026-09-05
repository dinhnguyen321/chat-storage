import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field thừa không được định nghĩa trong DTO
      transform: true, // Tự động chuyển đổi kiểu dữ liệu (ví dụ chuỗi số thành kiểu number)
    }),
  );

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
