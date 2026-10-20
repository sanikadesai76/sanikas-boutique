
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(data: {
    name: string;
    email: string;
    password: string;
  }) {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const password = data.password;

    if (!name || !email || !password) {
      throw new BadRequestException(
        'Name, email, and password are required.',
      );
    }

    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user,
      accessToken,
    };
  }

  async login(data: {
    email: string;
    password: string;
  }) {
    const email = data.email?.trim().toLowerCase();
    const password = data.password;

    if (!email || !password) {
      throw new BadRequestException(
        'Email and password are required.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    };
  }
}
