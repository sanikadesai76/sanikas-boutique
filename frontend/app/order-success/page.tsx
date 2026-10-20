'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <main
      className="order-success-page"
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header className="checkout-header">
        <Link href="/" className="checkout-logo">
          Sanika’s Boutique
        </Link>
        <span>Order Confirmation</span>
      </header>

      <section
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '620px',
            background: '#ffffff',
            border: '1px solid #eadfd3',
            borderRadius: '8px',
            padding: '48px 36px',
            textAlign: 'center',
            boxShadow: '0 12px 35px rgba(48, 40, 32, 0.06)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#f1e9df',
              color: '#49372b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '38px',
              margin: '0 auto 24px',
            }}
            aria-hidden="true"
          >
            ✓
          </div>

          <p
            style={{
              color: '#8b6b50',
              fontSize: '12px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Order successfully placed
          </p>

          <h1
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(28px, 4vw, 38px)',
              fontWeight: 400,
              color: '#302820',
              marginBottom: '16px',
            }}
          >
            Thank you for your order!
          </h1>

          <p style={{ color: '#6b625b', lineHeight: 1.8 }}>
            Your order is confirmed. Thank you for choosing Sanika’s Boutique.
            We hope you love your purchase.
          </p>

          {orderId && (
            <div
              style={{
                margin: '28px 0 18px',
                padding: '18px',
                background: '#faf7f3',
                borderRadius: '6px',
              }}
            >
              <p style={{ color: '#76685d', fontSize: '14px' }}>
                YOUR ORDER NUMBER
              </p>
              <p
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#302820',
                  marginTop: '6px',
                }}
              >
                #{orderId}
              </p>
            </div>
          )}

          <p style={{ color: '#6b625b', fontSize: '14px' }}>
            Order status: <strong style={{ color: '#8b6b50' }}>Pending</strong>
          </p>

          <Link
            href="/"
            style={{
              display: 'inline-block',
              width: '100%',
              marginTop: '30px',
              padding: '17px 24px',
              background: '#49372b',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '3px',
              fontSize: '12px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              boxSizing: 'border-box',
            }}
          >
            Continue Shopping
          </Link>

          <p
            style={{
              marginTop: '20px',
              color: '#8b8178',
              fontSize: '12px',
            }}
          >
            Thank you for supporting our boutique.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<p>Loading order confirmation...</p>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
