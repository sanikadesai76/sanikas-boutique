
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type OrderItem = {
  id: number;
  name: string;
  price: number | string;
  quantity: number;
};

type Order = {
  id: number;
  customerName: string;
  email: string;
  total: number | string;
  address: string;
  city: string;
  pincode: string;
  items: OrderItem[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOrders() {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setError('Please sign in to view your orders.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/orders/my-orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load your orders.',
          );
        }

        setOrders(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <main className="orders-page">
      <header className="navbar">
        <Link className="brand" href="/">
          Sanika’s Boutique
        </Link>
        <Link href="/">Continue shopping</Link>
      </header>

      <section className="orders-content">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>My Orders</h1>
        <p className="orders-intro">
          View your purchases and order details.
        </p>

        {loading ? (
          <p className="message">Loading your orders...</p>
        ) : error ? (
          <div className="orders-empty">
            <p>{error}</p>
            <Link href="/login">Sign in</Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            <h2>No orders yet</h2>
            <p>Your purchases will appear here after checkout.</p>
            <Link href="/">Explore the collection</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-heading">
                  <div>
                    <p className="order-label">ORDER NUMBER</p>
                    <h2>#{order.id}</h2>
                  </div>

                  <div className="order-total">
                    <p className="order-label">TOTAL</p>
                    <strong>
                      ₹{Number(order.total).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                <div className="order-items">
                  {order.items.map((item) => (
                    <div className="order-item" key={item.id}>
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>
                        ₹
                        {(
                          Number(item.price) * item.quantity
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="order-delivery">
                  <p className="order-label">DELIVERY ADDRESS</p>
                  <p>
                    {order.address}, {order.city} - {order.pincode}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
