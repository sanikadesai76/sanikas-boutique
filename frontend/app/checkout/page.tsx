
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '../context/CartContext';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal: {
    ondismiss: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: string,
    callback: (response: {
      error?: { description?: string };
    }) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        resolve(Boolean(window.Razorpay));
      }, { once: true });

      existingScript.addEventListener('error', () => {
        resolve(false);
      }, { once: true });

      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

function getErrorMessage(result: { message?: string | string[] }) {
  if (Array.isArray(result.message)) {
    return result.message.join(', ');
  }

  return result.message;
}

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (submitting) return;

    setSubmitting(true);

    try {
      if (cart.length === 0) {
        throw new Error('Your cart is empty.');
      }

      const token = localStorage.getItem('accessToken');

      if (!token) {
        throw new Error(
          'Please log in before placing your order.',
        );
      }

      const orderData = {
        customerName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
        })),
      };

      // Step 1: Ask the backend to create a Razorpay order.
      const createResponse = await fetch(
        `${API_URL}/orders/payment/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orderData),
        },
      );

      const paymentOrder = await createResponse.json().catch(() => ({}));

      if (!createResponse.ok) {
        if (createResponse.status === 401) {
          throw new Error(
            'Your session has expired. Please log in again.',
          );
        }

        throw new Error(
          getErrorMessage(paymentOrder) ||
            'Unable to start payment. Please try again.',
        );
      }

      if (
        !paymentOrder.razorpayOrderId ||
        !paymentOrder.keyId ||
        !paymentOrder.amount
      ) {
        throw new Error(
          'The server returned incomplete payment details.',
        );
      }

      // Step 2: Load Razorpay Checkout.
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          'Unable to load Razorpay Checkout. Check your internet connection and try again.',
        );
      }

      // Step 3: Open the payment window.
      await new Promise<void>((resolve) => {
        let finished = false;

        const finish = () => {
          if (finished) return;
          finished = true;
          resolve();
        };

        const checkout = new window.Razorpay!({
          key: paymentOrder.keyId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          name: 'Sanika’s Boutique',
          description: 'Boutique order payment',
          order_id: paymentOrder.razorpayOrderId,
          prefill: {
            name: form.name.trim(),
            email: form.email.trim(),
            contact: form.phone.trim(),
          },
          theme: {
            color: '#8b5e5e',
          },

          // Step 4: Verify payment on the backend.
          handler: async (paymentResponse) => {
            try {
              const verifyResponse = await fetch(
                `${API_URL}/orders/payment/verify`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    ...orderData,
                    razorpay_order_id:
                      paymentResponse.razorpay_order_id,
                    razorpay_payment_id:
                      paymentResponse.razorpay_payment_id,
                    razorpay_signature:
                      paymentResponse.razorpay_signature,
                  }),
                },
              );

              const result = await verifyResponse
                .json()
                .catch(() => ({}));

              if (!verifyResponse.ok) {
                throw new Error(
                  getErrorMessage(result) ||
                    'Payment verification failed. If money was deducted, contact support before paying again.',
                );
              }

              if (!result.id) {
                throw new Error(
                  'Payment was verified, but the order confirmation was incomplete. Check My Orders before retrying.',
                );
              }

              // Clear the cart only after the backend confirms
              // that the database order was created.
              await clearCart();

              router.push(
                `/order-success?orderId=${result.id}`,
              );
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : 'Unable to confirm your order. Check My Orders before retrying.',
              );
            } finally {
              finish();
            }
          },

          modal: {
            ondismiss: () => {
              setError(
                'Payment window closed. If you completed payment, check My Orders before trying again.',
              );
              finish();
            },
          },
        });

        checkout.on('payment.failed', (response) => {
          setError(
            response.error?.description ||
              'Payment failed. Please try again.',
          );
          finish();
        });

        checkout.open();
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.length === 0) {
    return (
      <main className="checkout-page">
        <header className="checkout-header">
          <Link href="/" className="checkout-logo">
            Sanika’s Boutique
          </Link>
          <span>Secure Checkout</span>
        </header>

        <div className="checkout-layout">
          <section className="checkout-form">
            <h1>Your cart is empty</h1>
            <p>Add products before proceeding to checkout.</p>
            <Link href="/">Continue shopping</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <Link href="/" className="checkout-logo">
          Sanika’s Boutique
        </Link>
        <span>Secure Checkout</span>
      </header>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h1>Delivery Details</h1>
          <p>Where should we deliver your order?</p>

          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
            required
          />

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />

          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            pattern="[0-9]{10}"
            maxLength={10}
            value={form.phone}
            onChange={handleChange}
            autoComplete="tel"
            placeholder="10-digit mobile number"
            required
          />

          <label htmlFor="address">Delivery address</label>
          <textarea
            id="address"
            name="address"
            rows={3}
            value={form.address}
            onChange={handleChange}
            autoComplete="street-address"
            required
          />

          <div className="checkout-fields-row">
            <div>
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                autoComplete="address-level2"
                required
              />
            </div>

            <div>
              <label htmlFor="pincode">PIN code</label>
              <input
                id="pincode"
                name="pincode"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={form.pincode}
                onChange={handleChange}
                autoComplete="postal-code"
                required
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              style={{ color: '#b42318', marginTop: '16px' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="checkout-place-button"
            disabled={submitting}
          >
            {submitting ? 'Processing Payment...' : 'Pay Now'}
          </button>

          <Link href="/cart" className="checkout-back-link">
            ← Return to cart
          </Link>
        </form>

        <aside className="checkout-summary">
          <h2>Order Summary</h2>

          {cart.map((item) => (
            <div className="checkout-summary-item" key={item.id}>
              <span>
                {item.name}
                {item.size ? ` (Size ${item.size})` : ''}
                {' × '}
                {item.quantity}
              </span>

              <span>
                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
              </span>
            </div>
          ))}

          <div className="checkout-total">
            <span>Order total</span>
            <strong>₹{total.toLocaleString('en-IN')}</strong>
          </div>

          <p className="checkout-summary-note">
            Secure payment powered by Razorpay.
          </p>
        </aside>
      </div>
    </main>
  );
}
