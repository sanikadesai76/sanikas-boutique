
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AdminGuard } from './admin.guard.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard],
  exports: [AuthService, AuthGuard, AdminGuard],
})
export class AuthModule {}
