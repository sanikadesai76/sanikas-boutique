
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
