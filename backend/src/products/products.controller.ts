
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';

import { ProductsService } from './products.service.js';
import { AuthGuard } from '../auth/auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';

type CreateProductBody = {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  stock?: number;
};

type UpdateProductBody = Partial<CreateProductBody>;

type CreateVariantBody = {
  size: string;
  stock: number;
};

type UpdateVariantBody = {
  stock: number;
};

function validateProduct(body: CreateProductBody | UpdateProductBody) {
  if ('name' in body && (
    typeof body.name !== 'string' || !body.name.trim()
  )) {
    throw new BadRequestException('Product name is required.');
  }

  if ('category' in body && (
    typeof body.category !== 'string' || !body.category.trim()
  )) {
    throw new BadRequestException('Product category is required.');
  }

  if ('description' in body && body.description != null &&
    typeof body.description !== 'string') {
    throw new BadRequestException('Description must be text.');
  }

  if ('imageUrl' in body && body.imageUrl != null &&
    typeof body.imageUrl !== 'string') {
    throw new BadRequestException('Image URL must be text.');
  }

  if ('price' in body && (
    typeof body.price !== 'number' ||
    !Number.isFinite(body.price) ||
    body.price < 0
  )) {
    throw new BadRequestException('Price must be a non-negative number.');
  }

  if ('stock' in body && (
    !Number.isInteger(body.stock) ||
    (body.stock as number) < 0
  )) {
    throw new BadRequestException(
      'Stock must be a non-negative integer.',
    );
  }
}

function validateVariant(body: CreateVariantBody) {
  if (
    !body?.size ||
    typeof body.size !== 'string' ||
    !body.size.trim() ||
    !Number.isInteger(body.stock) ||
    body.stock < 0
  ) {
    throw new BadRequestException(
      'Provide a valid size and a non-negative integer stock.',
    );
  }
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Public storefront endpoints
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // Admin-only product management
  @UseGuards(AuthGuard, AdminGuard)
  @Post()
  createProduct(@Body() body: CreateProductBody) {
    validateProduct(body);

    if (
      typeof body.name !== 'string' ||
      typeof body.category !== 'string' ||
      typeof body.price !== 'number'
    ) {
      throw new BadRequestException(
        'Name, category, and numeric price are required.',
      );
    }

    return this.productsService.createProduct({
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
      price: body.price,
      imageUrl: body.imageUrl?.trim() || undefined,
      category: body.category.trim(),
      stock: body.stock ?? 0,
    });
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(':id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductBody,
  ) {
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('Provide fields to update.');
    }

    validateProduct(body);

    return this.productsService.updateProduct(id, {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.category !== undefined && {
        category: body.category.trim(),
      }),
      ...(body.description !== undefined && {
        description: body.description?.trim() || null,
      }),
      ...(body.imageUrl !== undefined && {
        imageUrl: body.imageUrl?.trim() || null,
      }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.stock !== undefined && { stock: body.stock }),
    });
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(':id')
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteProduct(id);
  }

  // Admin-only size and inventory management
  @UseGuards(AuthGuard, AdminGuard)
  @Post(':id/variants')
  createVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateVariantBody,
  ) {
    validateVariant(body);

    return this.productsService.createVariant(id, {
      size: body.size.trim().toUpperCase(),
      stock: body.stock,
    });
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(':id/variants/:variantId')
  updateVariantStock(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() body: UpdateVariantBody,
  ) {
    if (!Number.isInteger(body?.stock) || body.stock < 0) {
      throw new BadRequestException(
        'Stock must be a non-negative integer.',
      );
    }

    return this.productsService.updateVariantStock(
      id,
      variantId,
      body.stock,
    );
  }
}
