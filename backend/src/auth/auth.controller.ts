
import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth/auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    sub?: number;
    email: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('signup')
  async signup(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
    },
  ) {
    if (
      !body ||
      typeof body.name !== 'string' ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string'
    ) {
      throw new BadRequestException(
        'Name, email, and password are required.',
      );
    }

    return this.authService.signup(body);
  }

  @Post('login')
  async login(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ) {
    if (
      !body ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string'
    ) {
      throw new BadRequestException(
        'Email and password are required.',
      );
    }

    return this.authService.login(body);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      message: 'Authentication successful.',
      user: {
        userId: request.user.userId ?? request.user.sub,
        email: request.user.email,
        role: request.user.role,
      },
    };
  }
}
