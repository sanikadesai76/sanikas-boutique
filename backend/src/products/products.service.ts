
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

type CreateProductData = {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  stock: number;
};

type UpdateProductData = {
  name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  category?: string;
  stock?: number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const count = await this.prisma.product.count();
    console.log(`[diagnostic] Product count: ${count}`);

    const products = await this.prisma.product.findMany({
      include: {
        variants: {
          orderBy: { size: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    console.log(`[diagnostic] Products returned: ${products.length}`);
    return products;
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { size: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  async createProduct(data: CreateProductData) {
    return this.prisma.product.create({
      data,
      include: {
        variants: {
          orderBy: { size: 'asc' },
        },
      },
    });
  }

  async updateProduct(id: number, data: UpdateProductData) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Product not found.');
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        variants: {
          orderBy: { size: 'asc' },
        },
      },
    });
  }

  async deleteProduct(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        cartItems: { select: { id: true } },
        variants: {
          include: {
            cartItems: { select: { id: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const linkedCartItems =
      product.cartItems.length +
      product.variants.reduce(
        (total, variant) => total + variant.cartItems.length,
        0,
      );

    if (linkedCartItems > 0) {
      throw new ConflictException(
        'This product is in one or more carts. Remove it from carts before deleting it.',
      );
    }

    const orderItemCount = await this.prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderItemCount > 0) {
      throw new ConflictException(
        'This product has order history and cannot be deleted. Consider setting its stock to zero instead.',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      message: 'Product deleted successfully.',
      id,
    };
  }

  async createVariant(
    productId: number,
    data: { size: string; stock: number },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    try {
      return await this.prisma.productVariant.create({
        data: {
          productId,
          size: data.size,
          stock: data.stock,
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This size already exists for the product.',
        );
      }

      throw error;
    }
  }

  async updateVariantStock(
    productId: number,
    variantId: number,
    stock: number,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
    });

    if (!variant) {
      throw new NotFoundException(
        'The size variant was not found for this product.',
      );
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
    });
  }
}
