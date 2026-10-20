
import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service.js';
import { AuthGuard } from '../auth/auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';

type AuthenticatedRequest = Request & {
  user: {
    userId: number;
    email: string;
    role: string;
  };
};

type CreateOrderBody = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  items: {
    productId: number;
    variantId?: number | null;
    quantity: number;
  }[];
};

type VerifyPaymentBody = CreateOrderBody & {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

const ALLOWED_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  private validateOrderBody(body: CreateOrderBody) {
    const missingFields = [
      !body?.customerName?.trim() && 'customerName',
      !body?.email?.trim() && 'email',
      !body?.phone?.trim() && 'phone',
      !body?.address?.trim() && 'address',
      !body?.city?.trim() && 'city',
      !body?.pincode?.trim() && 'pincode',
      (!Array.isArray(body?.items) ||
        body.items.length === 0) &&
        'items',
    ].filter(Boolean);

    if (missingFields.length > 0) {
      throw new BadRequestException({
        message: 'Missing required order fields',
        missingFields,
      });
    }
  }

  @UseGuards(AuthGuard)
  @Post('payment/create')
  async createPayment(
    @Body() body: CreateOrderBody,
    @Req() request: AuthenticatedRequest,
  ) {
    this.validateOrderBody(body);

    return this.ordersService.createPaymentOrder(
      body,
      request.user.userId,
    );
  }

  @UseGuards(AuthGuard)
  @Post('payment/verify')
  async verifyPayment(
    @Body() body: VerifyPaymentBody,
    @Req() request: AuthenticatedRequest,
  ) {
    this.validateOrderBody(body);

    return this.ordersService.verifyPayment(
      body,
      request.user.userId,
    );
  }

  // Direct POST /orders is intentionally disabled.
  // Orders must be created through verified Razorpay payment.

  @UseGuards(AuthGuard)
  @Get('my-orders')
  async getMyOrders(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.getMyOrders(
      request.user.userId,
    );
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/all')
  async getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch('admin/:id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: string },
  ) {
    if (
      typeof body?.status !== 'string' ||
      !ALLOWED_STATUSES.includes(body.status)
    ) {
      throw new BadRequestException(
        `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.`,
      );
    }

    return this.ordersService.updateStatus(
      id,
      body.status,
    );
  }
}
