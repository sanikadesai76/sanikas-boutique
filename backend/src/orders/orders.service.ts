
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';

type OrderItemInput = {
  productId: number;
  variantId?: number | null;
  quantity: number;
};

type SavedOrderItem = OrderItemInput & {
  unitPrice: number;
  itemName: string;
};

type CreateOrderInput = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  items: OrderItemInput[];
};

type PaymentResponse = {
  order_id: string;
  status: string;
  amount: number;
  currency: string;
};

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
};

@Injectable()
export class OrdersService {
  private readonly razorpay: Razorpay;
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error(
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured in backend/.env',
      );
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  private validateItems(items: OrderItemInput[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException(
        'Your order must contain at least one item.',
      );
    }

    const combinedItems = new Map<string, OrderItemInput>();

    for (const item of items) {
      if (
        !Number.isInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isSafeInteger(item.quantity) ||
        (item.variantId != null &&
          (!Number.isInteger(item.variantId) || item.variantId <= 0))
      ) {
        throw new BadRequestException(
          'Invalid product, variant, or quantity.',
        );
      }

      const variantId = item.variantId ?? null;
      const key = `${item.productId}:${variantId ?? 'none'}`;
      const existing = combinedItems.get(key);

      if (existing) {
        existing.quantity += item.quantity;

        if (!Number.isSafeInteger(existing.quantity)) {
          throw new BadRequestException(
            'Requested quantity is too large.',
          );
        }
      } else {
        combinedItems.set(key, {
          productId: item.productId,
          variantId,
          quantity: item.quantity,
        });
      }
    }

    return [...combinedItems.values()];
  }

  private async preparePaymentItems(items: OrderItemInput[]) {
    const combinedItems = this.validateItems(items);
    const savedItems: SavedOrderItem[] = [];
    let totalPaise = 0;

    for (const item of combinedItems) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Product ${item.productId} was not found.`,
        );
      }

      let availableStock = product.stock;
      let itemName = product.name;

      if (item.variantId != null) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant || variant.productId !== product.id) {
          throw new BadRequestException(
            `The selected variant is invalid for ${product.name}.`,
          );
        }

        availableStock = variant.stock;
        itemName = `${product.name} - Size ${variant.size}`;
      } else {
        const variantCount = await this.prisma.productVariant.count({
          where: { productId: product.id },
        });

        if (variantCount > 0) {
          throw new BadRequestException(
            `Please select a size for ${product.name}.`,
          );
        }
      }

      if (availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${itemName}. Available: ${availableStock}.`,
        );
      }

      const unitPrice = Number(product.price);

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new BadRequestException(
          `Invalid price for ${product.name}.`,
        );
      }

      totalPaise += Math.round(unitPrice * 100) * item.quantity;

      savedItems.push({
        ...item,
        unitPrice,
        itemName,
      });
    }

    if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) {
      throw new BadRequestException('Invalid order total.');
    }

    return { amount: totalPaise, items: savedItems };
  }

  async createPaymentOrder(data: CreateOrderInput, userId: number) {
    const prepared = await this.preparePaymentItems(data.items);

    let paymentOrder: RazorpayOrderResponse;

    try {
      paymentOrder = (await this.razorpay.orders.create({
        amount: prepared.amount,
        currency: 'INR',
        receipt: `u${userId}_${Date.now()}`.slice(0, 40),
        notes: {
          userId: String(userId),
        },
      })) as RazorpayOrderResponse;
    } catch {
      throw new ServiceUnavailableException(
        'Unable to create a Razorpay order. Please try again.',
      );
    }

    try {
      await this.prisma.paymentAttempt.create({
        data: {
          userId,
          razorpayOrderId: paymentOrder.id,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          status: 'CREATED',
          customerName: data.customerName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          items: JSON.parse(
            JSON.stringify(prepared.items),
          ) as Prisma.InputJsonValue,
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Unable to save the payment attempt. Please restart checkout.',
      );
    }

    return {
      razorpayOrderId: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyPayment(
    data: CreateOrderInput & {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    userId: number,
  ) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = data;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      throw new BadRequestException(
        'Razorpay payment details are required.',
      );
    }

    const attempt = await this.prisma.paymentAttempt.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        userId,
      },
    });

    if (!attempt) {
      throw new BadRequestException(
        'Payment order not found for this account.',
      );
    }

    // Return the existing order for a legitimate verification retry.
    if (attempt.status === 'PAID' && attempt.orderId) {
      const existingOrder = await this.prisma.order.findUnique({
        where: { id: attempt.orderId },
        include: { items: true },
      });

      if (existingOrder) {
        if (attempt.razorpayPaymentId !== razorpay_payment_id) {
          throw new BadRequestException(
            'This payment attempt has already been completed.',
          );
        }

        return existingOrder;
      }

      throw new BadRequestException(
        'The completed payment has no associated order. Contact support.',
      );
    }

    if (attempt.status !== 'CREATED') {
      throw new BadRequestException(
        'This payment attempt cannot be verified again.',
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new ServiceUnavailableException(
        'Razorpay is not configured correctly.',
      );
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest();

    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      throw new UnauthorizedException('Invalid payment signature.');
    }

    const receivedSignature = Buffer.from(
      razorpay_signature,
      'hex',
    );

    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      throw new UnauthorizedException(
        'Payment verification failed.',
      );
    }

    let payment: PaymentResponse;
    let razorpayOrder: RazorpayOrderResponse;

    try {
      const results = await Promise.all([
        this.razorpay.payments.fetch(razorpay_payment_id),
        this.razorpay.orders.fetch(razorpay_order_id),
      ]);

      payment = results[0] as unknown as PaymentResponse;
      razorpayOrder = results[1] as unknown as RazorpayOrderResponse;
    } catch {
      throw new ServiceUnavailableException(
        'Unable to verify payment with Razorpay. Please try again.',
      );
    }

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== 'captured' ||
      payment.amount !== attempt.amount ||
      payment.amount !== razorpayOrder.amount ||
      payment.currency !== 'INR' ||
      attempt.currency !== 'INR' ||
      razorpayOrder.currency !== 'INR' ||
      razorpayOrder.status !== 'paid' ||
      razorpayOrder.notes?.userId !== String(userId)
    ) {
      throw new BadRequestException(
        'Payment is not captured or does not match this order.',
      );
    }

    const savedItems = attempt.items as unknown as SavedOrderItem[];

    if (
      !Array.isArray(savedItems) ||
      savedItems.length === 0 ||
      savedItems.some(
        (item) =>
          !Number.isInteger(item.productId) ||
          !Number.isInteger(item.quantity) ||
          !Number.isFinite(item.unitPrice) ||
          typeof item.itemName !== 'string',
      )
    ) {
      throw new BadRequestException(
        'The saved order details are invalid. Contact support.',
      );
    }

    const savedData: CreateOrderInput = {
      customerName: attempt.customerName,
      email: attempt.email,
      phone: attempt.phone,
      address: attempt.address,
      city: attempt.city,
      pincode: attempt.pincode,
      items: savedItems,
    };

    // Create the order and update stock/payment state transactionally.
    const order = await this.create(savedData, userId, {
      paymentAttemptId: attempt.id,
      razorpayPaymentId: razorpay_payment_id,
      savedItems,
    });

    // Send the confirmation after the order transaction commits.
    // Email failures must not invalidate successful payment.
    try {
      await this.emailService.sendOrderConfirmation({
        id: order.id,
        customerName: order.customerName,
        email: order.email,
        total: order.total,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Confirmation email failed for order #${order.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    return order;
  }

  private async create(
    data: CreateOrderInput,
    userId?: number,
    payment?: {
      paymentAttemptId: number;
      razorpayPaymentId: string;
      savedItems: SavedOrderItem[];
    },
  ) {
    const combinedItems = this.validateItems(data.items);
    const savedItemMap = new Map<string, SavedOrderItem>();

    if (payment) {
      for (const item of payment.savedItems) {
        savedItemMap.set(
          `${item.productId}:${item.variantId ?? 'none'}`,
          item,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let totalPaise = 0;

      const orderItems: {
        productId: number;
        name: string;
        price: number;
        quantity: number;
      }[] = [];

      for (const item of combinedItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product ${item.productId} was not found.`,
          );
        }

        let availableStock = product.stock;
        let itemName = product.name;

        if (item.variantId != null) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });

          if (!variant || variant.productId !== product.id) {
            throw new BadRequestException(
              `The selected variant is invalid for ${product.name}.`,
            );
          }

          availableStock = variant.stock;
          itemName = `${product.name} - Size ${variant.size}`;
        } else {
          const variantCount = await tx.productVariant.count({
            where: { productId: product.id },
          });

          if (variantCount > 0) {
            throw new BadRequestException(
              `Please select a size for ${product.name}.`,
            );
          }
        }

        if (availableStock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${itemName}. Available: ${availableStock}.`,
          );
        }

        const snapshot = payment
          ? savedItemMap.get(
              `${item.productId}:${item.variantId ?? 'none'}`,
            )
          : undefined;

        if (payment && !snapshot) {
          throw new BadRequestException(
            'The saved payment items do not match the order.',
          );
        }

        const unitPrice = snapshot?.unitPrice ?? Number(product.price);
        const savedName = snapshot?.itemName ?? itemName;

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new BadRequestException('Invalid order item price.');
        }

        totalPaise += Math.round(unitPrice * 100) * item.quantity;

        orderItems.push({
          productId: product.id,
          name: savedName,
          price: unitPrice,
          quantity: item.quantity,
        });
      }

      if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) {
        throw new BadRequestException('Invalid order total.');
      }

      if (payment) {
        const attempt = await tx.paymentAttempt.findUnique({
          where: { id: payment.paymentAttemptId },
        });

        if (!attempt || attempt.amount !== totalPaise) {
          throw new BadRequestException(
            'The saved order total does not match the payment.',
          );
        }
      }

      const order = await tx.order.create({
        data: {
          ...(userId ? { userId } : {}),
          customerName: data.customerName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          total: totalPaise / 100,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of combinedItems) {
        if (item.variantId != null) {
          const result = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              productId: item.productId,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (result.count !== 1) {
            throw new BadRequestException(
              'Stock changed while placing the order. Please contact support if payment was captured.',
            );
          }
        } else {
          const result = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (result.count !== 1) {
            throw new BadRequestException(
              'Stock changed while placing the order. Please contact support if payment was captured.',
            );
          }
        }
      }

      if (payment) {
        const updated = await tx.paymentAttempt.updateMany({
          where: {
            id: payment.paymentAttemptId,
            userId,
            status: 'CREATED',
            orderId: null,
            razorpayPaymentId: null,
          },
          data: {
            status: 'PAID',
            razorpayPaymentId: payment.razorpayPaymentId,
            orderId: order.id,
          },
        });

        if (updated.count !== 1) {
          throw new BadRequestException(
            'This payment has already been processed. Please check your order history.',
          );
        }
      }

      return order;
    });
  }

  async getMyOrders(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return [];
    }

    return this.prisma.order.findMany({
      where: {
        OR: [
          { userId },
          {
            userId: null,
            email: user.email,
          },
        ],
      },
      include: {
        items: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(id: number, status: string) {
    const allowedStatuses = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
    ];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid order status.');
    }

    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        customerName: true,
        email: true,
        status: true,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order ${id} was not found.`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify the customer only when the status actually changes.
    if (
      existingOrder.status !== updatedOrder.status &&
      ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(
        updatedOrder.status,
      )
    ) {
      try {
        await this.emailService.sendOrderStatusUpdate({
          id: updatedOrder.id,
          customerName: updatedOrder.customerName,
          email: updatedOrder.email,
          status: updatedOrder.status,
        });
      } catch (error) {
        this.logger.error(
          `Status notification failed for order #${updatedOrder.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    return updatedOrder;
  }
}
