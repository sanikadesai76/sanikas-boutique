
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: number) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: true,
        variant: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addItem(
    userId: number,
    productId: number,
    quantity: number,
    variantId: number | null = null,
  ) {
    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      (variantId !== null &&
        (!Number.isInteger(variantId) || variantId <= 0))
    ) {
      throw new BadRequestException(
        'Product ID, variant ID, and quantity must be valid positive integers.',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    let variantKey = '';

    if (variantId !== null) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.productId !== productId) {
        throw new BadRequestException(
          'The selected size does not belong to this product.',
        );
      }

      variantKey = `variant-${variant.id}`;
    } else {
      const variants = await this.prisma.productVariant.count({
        where: { productId },
      });

      if (variants > 0) {
        throw new BadRequestException(
          'Please select a size for this product.',
        );
      }
    }

    const stock = variantId === null
      ? product.stock
      : (
          await this.prisma.productVariant.findUniqueOrThrow({
            where: { id: variantId },
          })
        ).stock;

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId_variantKey: {
          userId,
          productId,
          variantKey,
        },
      },
    });

    const newQuantity = (existingItem?.quantity ?? 0) + quantity;

    if (newQuantity > stock) {
      throw new BadRequestException(
        `Requested quantity exceeds available stock (${stock}).`,
      );
    }

    return this.prisma.cartItem.upsert({
      where: {
        userId_productId_variantKey: {
          userId,
          productId,
          variantKey,
        },
      },
      create: {
        userId,
        productId,
        variantId,
        variantKey,
        quantity,
      },
      update: {
        quantity: newQuantity,
        variantId,
      },
      include: {
        product: true,
        variant: true,
      },
    });
  }

  async updateQuantity(
    userId: number,
    cartItemId: number,
    quantity: number,
  ) {
    if (
      !Number.isInteger(cartItemId) ||
      cartItemId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new BadRequestException(
        'Cart item ID and quantity must be positive integers.',
      );
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
      include: {
        product: true,
        variant: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found.');
    }

    const stock = item.variant
      ? item.variant.stock
      : item.product.stock;

    if (quantity > stock) {
      throw new BadRequestException(
        `Requested quantity exceeds available stock (${stock}).`,
      );
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
      include: {
        product: true,
        variant: true,
      },
    });
  }

  async removeItem(userId: number, cartItemId: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found.');
    }

    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });

    return { message: 'Item removed from cart.' };
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    return { message: 'Cart cleared successfully.' };
  }
}
