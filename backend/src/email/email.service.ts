
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async sendOrderConfirmation(order: {
    id: number;
    customerName: string;
    email: string;
    total: unknown;
    items: {
      name: string;
      quantity: number;
      price: unknown;
    }[];
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        'Resend API key missing; confirmation email skipped.',
      );
      return;
    }

    const from =
      process.env.EMAIL_FROM ??
      "Sanika's Boutique <onboarding@resend.dev>";

    try {
      const { error } = await this.resend.emails.send({
        from,
        to: [order.email],
        subject: `Order confirmation #${order.id} — Sanika's Boutique`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2>Thank you for your order, ${this.escapeHtml(order.customerName)}!</h2>
            <p>Your payment was successful and your order has been confirmed.</p>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <h3>Order summary</h3>
            <ul>
              ${order.items
                .map(
                  (item) =>
                    `<li>${this.escapeHtml(item.name)} × ${item.quantity} — ₹${Number(item.price).toFixed(2)}</li>`,
                )
                .join('')}
            </ul>
            <p><strong>Total: ₹${Number(order.total).toFixed(2)}</strong></p>
            <p>Thank you for shopping with Sanika's Boutique!</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(
          `Order confirmation email failed: ${error.message}`,
        );
        return;
      }

      this.logger.log(
        `Confirmation email sent for order #${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Order confirmation email failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async sendOrderStatusUpdate(order: {
    id: number;
    customerName: string;
    email: string;
    status: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Status email skipped for order #${order.id}: Resend API key missing.`,
      );
      return;
    }

    const messages: Record<
      string,
      { subject: string; message: string }
    > = {
      CONFIRMED: {
        subject: 'Your order is confirmed!',
        message:
          'We have confirmed your order and will prepare it for you.',
      },
      PROCESSING: {
        subject: 'Your order is being prepared',
        message: 'We are preparing your order for shipment.',
      },
      SHIPPED: {
        subject: 'Your order has been shipped!',
        message:
          'Your order is on its way. Thank you for shopping with us!',
      },
      DELIVERED: {
        subject: 'Your order has been delivered!',
        message:
          'Your order has been marked as delivered. We hope you love it!',
      },
    };

    const notification = messages[order.status];

    if (!notification) {
      return;
    }

    const from =
      process.env.EMAIL_FROM ??
      "Sanika's Boutique <onboarding@resend.dev>";

    try {
      const { error } = await this.resend.emails.send({
        from,
        to: [order.email],
        subject: `${notification.subject} — Sanika's Boutique`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2>Hello ${this.escapeHtml(order.customerName)},</h2>
            <p>${this.escapeHtml(notification.message)}</p>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Current status:</strong> ${this.escapeHtml(order.status)}</p>
            <p>Thank you for shopping with Sanika's Boutique!</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(
          `Status email failed for order #${order.id}: ${error.message}`,
        );
        return;
      }

      this.logger.log(
        `Status email sent for order #${order.id}: ${order.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Status email failed for order #${order.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character]!,
    );
  }
}
