
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CartService } from './cart.service.js';
import { AuthGuard } from '../auth/auth/auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('items')
  addItem(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      productId: number;
      variantId?: number | null;
      quantity?: number;
    },
  ) {
    const productId = Number(body?.productId);
    const quantity = body?.quantity === undefined ? 1 : Number(body.quantity);

    const variantId =
      body?.variantId === undefined || body.variantId === null
        ? null
        : Number(body.variantId);

    if (
      !Number.isInteger(productId) ||
      !Number.isInteger(quantity) ||
      (variantId !== null && !Number.isInteger(variantId))
    ) {
      throw new BadRequestException(
        'Product ID, variant ID, and quantity must be valid integers.',
      );
    }

    return this.cartService.addItem(
      req.user.userId,
      productId,
      quantity,
      variantId,
    );
  }

  @Patch('items/:cartItemId')
  updateQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('cartItemId', ParseIntPipe) cartItemId: number,
    @Body() body: { quantity: number },
  ) {
    const quantity = Number(body?.quantity);

    if (!Number.isInteger(quantity)) {
      throw new BadRequestException('Quantity must be an integer.');
    }

    return this.cartService.updateQuantity(
      req.user.userId,
      cartItemId,
      quantity,
    );
  }

  @Delete('items/:cartItemId')
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('cartItemId', ParseIntPipe) cartItemId: number,
  ) {
    return this.cartService.removeItem(req.user.userId, cartItemId);
  }

  @Delete()
  clearCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.clearCart(req.user.userId);
  }
}
