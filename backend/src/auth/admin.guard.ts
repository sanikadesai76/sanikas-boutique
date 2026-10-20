
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type AdminRequest = Request & {
  user: {
    userId: number;
    email: string;
    role: string;
  };
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();

    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Administrator access is required.',
      );
    }

    return true;
  }
}
