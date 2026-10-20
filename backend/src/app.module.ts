import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CartModule } from './cart/cart.module.js';


@Module({
  imports: [PrismaModule, ProductsModule, OrdersModule, AuthModule, CartModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
