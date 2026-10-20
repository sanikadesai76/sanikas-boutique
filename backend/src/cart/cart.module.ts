
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
