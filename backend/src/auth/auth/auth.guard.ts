

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: {
    userId: number;
    email: string;
    role: string;
  };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authentication token is missing.',
      );
    }

    let payload: { sub: number; email: string };

    try {
      payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
      }>(authHeader.substring(7));
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user || user.email !== payload.email) {
      throw new UnauthorizedException('User account is not valid.');
    }

    request.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return true;
  }
}
