
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
] as const;

type OrderStatus = (typeof STATUSES)[number];

type OrderItem = {
  id?: number;
  name?: string;
  productName?: string;
  product?: { name?: string };
  variant?: { size?: string };
  size?: string;
  price?: number | string;
  quantity?: number;
};

type Order = {
  id: number;
  status?: string;
  customerName?: string;
  email?: string;
  user?: { name?: string; email?: string };
  total?: number | string;
  address?: string;
  city?: string;
  pincode?: string;
  createdAt?: string;
  items?: OrderItem[];
};

function money(value: number | string | undefined) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function productName(item: OrderItem) {
  return item.product?.name ?? item.productName ?? item.name ?? 'Product';
}

function statusStyle(status?: string): React.CSSProperties {
  const palette: Record<string, { background: string; color: string }> = {
    PENDING: { background: '#fff0d9', color: '#946019' },
    CONFIRMED: { background: '#e4f2ef', color: '#286d61' },
    PROCESSING: { background: '#f4e8fb', color: '#774795' },
    SHIPPED: { background: '#e4edf8', color: '#315c8b' },
    DELIVERED: { background: '#e4f1e6', color: '#356744' },
  };

  return palette[status ?? ''] ?? {
    background: '#eee9e3',
    color: '#66594e',
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f8f4ee',
    color: '#382820',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  sidebar: {
    position: 'fixed',
    inset: '0 auto 0 0',
    width: 245,
    background: '#49362c',
    color: '#fff8f0',
    padding: '32px 23px',
    display: 'flex',
    flexDirection: 'column',
    gap: 34,
    boxSizing: 'border-box',
    zIndex: 2,
  },
  brand: {
    color: '#fff8f0',
    fontFamily: 'Georgia, serif',
    fontSize: 28,
    lineHeight: 1.2,
    textDecoration: 'none',
  },
  brandCaption: {
    color: '#d8b99e',
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 10,
  },
  sideLabel: {
    color: '#cbb19e',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sideLink: {
    display: 'block',
    padding: '14px',
    marginBottom: 6,
    color: '#fff8f0',
    background: '#654b3c',
    borderRadius: 7,
    textDecoration: 'none',
    fontSize: 13,
  },
  sideLinkMuted: {
    display: 'block',
    padding: '13px 14px',
    color: '#e0cfc2',
    textDecoration: 'none',
    fontSize: 13,
  },
  sideBottom: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTop: '1px solid #705547',
    color: '#d8c5b7',
    fontSize: 12,
    lineHeight: 1.9,
  },
  main: {
    marginLeft: 245,
    minWidth: 0,
    padding: '0 38px 55px',
    boxSizing: 'border-box',
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 15,
    padding: '24px 0',
    borderBottom: '1px solid #e7dcd1',
  },
  breadcrumb: {
    color: '#89776a',
    fontSize: 12,
  },
  topLink: {
    display: 'inline-block',
    color: '#49372e',
    border: '1px solid #dfd1c4',
    borderRadius: 7,
    padding: '11px 15px',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 600,
    background: '#fffdfb',
  },
  content: {
    maxWidth: 1450,
    margin: '0 auto',
  },
  intro: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 20,
    flexWrap: 'wrap',
    padding: '34px 0 26px',
  },
  eyebrow: {
    color: '#9a765b',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2.5,
    margin: '0 0 12px',
  },
  heading: {
    fontFamily: 'Georgia, serif',
    fontWeight: 400,
    fontSize: 'clamp(32px, 3.4vw, 46px)',
    letterSpacing: -1,
    lineHeight: 1.15,
    margin: 0,
  },
  subtitle: {
    color: '#827368',
    fontSize: 13,
    lineHeight: 1.9,
    marginTop: 12,
  },
  refresh: {
    border: 'none',
    borderRadius: 7,
    padding: '13px 17px',
    background: '#49362c',
    color: '#fff8f0',
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    background: '#fffdfb',
    border: '1px solid #ebe2d9',
    borderRadius: 10,
    padding: '22px 20px',
    minHeight: 118,
    boxSizing: 'border-box',
  },
  statLabel: {
    display: 'block',
    color: '#8e7c6f',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.1,
    lineHeight: 1.6,
  },
  statValue: {
    display: 'block',
    marginTop: 15,
    fontSize: 28,
    fontFamily: 'Georgia, serif',
    fontWeight: 400,
    overflowWrap: 'anywhere',
  },
  statNote: {
    display: 'block',
    color: '#a08e80',
    fontSize: 10,
    marginTop: 8,
    lineHeight: 1.5,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 13,
    flexWrap: 'wrap',
    marginBottom: 17,
  },
  search: {
    flex: '1 1 250px',
    width: '100%',
    maxWidth: 400,
    minWidth: 0,
    boxSizing: 'border-box',
    border: '1px solid #e5dacf',
    background: '#fffdfb',
    color: '#342820',
    borderRadius: 7,
    padding: '14px 15px',
    fontSize: 12,
    outlineColor: '#a17a61',
  },
  filterWrap: {
    display: 'flex',
    gap: 7,
    flexWrap: 'wrap',
  },
  filter: {
    border: '1px solid #e1d5ca',
    borderRadius: 6,
    padding: '10px 11px',
    background: '#fffdfb',
    color: '#6c5b4e',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 600,
  },
  filterActive: {
    border: '1px solid #49372e',
    borderRadius: 6,
    padding: '10px 11px',
    background: '#49372e',
    color: '#fff9f3',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 600,
  },
  tableShell: {
    background: '#fffdfb',
    border: '1px solid #e9dfd5',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableScroll: {
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    width: '100%',
    minWidth: 900,
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    background: '#f1eae2',
    color: '#816e60',
    padding: '15px 16px',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '17px 16px',
    borderTop: '1px solid #f0e9e2',
    verticalAlign: 'top',
    fontSize: 12,
    color: '#514338',
  },
  orderNumber: {
    color: '#49372e',
    fontSize: 14,
    fontWeight: 700,
  },
  customerName: {
    color: '#342820',
    fontSize: 12,
    fontWeight: 700,
  },
  secondaryText: {
    color: '#978579',
    fontSize: 11,
    lineHeight: 1.7,
    overflowWrap: 'anywhere',
    marginTop: 5,
  },
  statusBadge: {
    display: 'inline-block',
    borderRadius: 20,
    padding: '7px 10px',
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  select: {
    width: 145,
    maxWidth: '100%',
    padding: '10px 8px',
    border: '1px solid #dfd2c6',
    borderRadius: 6,
    background: '#fffdfb',
    color: '#49372e',
    fontSize: 11,
    cursor: 'pointer',
  },
  itemLine: {
    padding: '3px 0',
    color: '#5d4c40',
    lineHeight: 1.7,
  },
  message: {
    padding: 15,
    margin: '15px 0',
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.6,
  },
  error: {
    background: '#fff0ed',
    border: '1px solid #f1d2cc',
    color: '#963b2c',
  },
  success: {
    background: '#eaf4e9',
    border: '1px solid #d4e7d1',
    color: '#376b3b',
  },
  empty: {
    padding: '50px 20px',
    textAlign: 'center',
    color: '#89796e',
    lineHeight: 1.9,
  },
  accessPage: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
    background: '#f8f4ee',
    color: '#382820',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  accessBrandPanel: {
    background: '#49362c',
    color: '#fff8f0',
    padding: 'clamp(30px, 6vw, 76px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 350,
    boxSizing: 'border-box',
  },
  accessBrand: {
    color: '#fff8f0',
    fontFamily: 'Georgia, serif',
    fontSize: 28,
    lineHeight: 1.2,
    textDecoration: 'none',
  },
  accessBrandTitle: {
    fontFamily: 'Georgia, serif',
    fontWeight: 400,
    fontSize: 'clamp(38px, 5vw, 62px)',
    lineHeight: 1.12,
    margin: '20px 0',
  },
  accessContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(28px, 5vw, 65px)',
    boxSizing: 'border-box',
  },
  accessInner: {
    width: '100%',
    maxWidth: 410,
  },
  accessTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 'clamp(34px, 4vw, 46px)',
    fontWeight: 400,
    lineHeight: 1.15,
    margin: '0 0 18px',
  },
  accessButton: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    boxSizing: 'border-box',
    padding: '16px 20px',
    borderRadius: 7,
    background: '#49362c',
    color: '#fff8f0',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  accessSecondary: {
    display: 'block',
    textAlign: 'center',
    marginTop: 17,
    padding: 12,
    color: '#765d4d',
    textDecoration: 'none',
    fontSize: 13,
  },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    setAccessDenied(false);

    const token = localStorage.getItem('accessToken');

    if (!token) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setAccessDenied(true);
        return;
      }

      if (!response.ok) {
        throw new Error(
          typeof data.message === 'string'
            ? data.message
            : 'Unable to load orders.',
        );
      }

      if (!Array.isArray(data)) {
        throw new Error('Unexpected order data returned by the server.');
      }

      setOrders(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load orders.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function updateStatus(orderId: number, status: OrderStatus) {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setAccessDenied(true);
      return;
    }

    if (orders.find((order) => order.id === orderId)?.status === status) {
      return;
    }

    setUpdatingId(orderId);
    setError('');
    setNotice('');

    try {
      const response = await fetch(
        `${API_URL}/orders/admin/${orderId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setAccessDenied(true);
        return;
      }

      if (!response.ok) {
        throw new Error(
          typeof data.message === 'string'
            ? data.message
            : 'Unable to update this order.',
        );
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, ...data, status } : order,
        ),
      );

      setNotice(`Order #${orderId} is now ${status}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update order.',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const pendingCount = orders.filter(
    (order) => order.status === 'PENDING',
  ).length;

  const processingCount = orders.filter((order) =>
    ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status ?? ''),
  ).length;

  const deliveredCount = orders.filter(
    (order) => order.status === 'DELIVERED',
  ).length;

  const confirmedValue = orders.reduce(
    (sum, order) =>
      ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(
        order.status ?? '',
      )
        ? sum + Number(order.total ?? 0)
        : sum,
    0,
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...orders]
      .filter((order) => filter === 'ALL' || order.status === filter)
      .filter((order) => {
        const customer = order.customerName ?? order.user?.name ?? '';
        const email = order.email ?? order.user?.email ?? '';

        const haystack = [
          String(order.id),
          customer,
          email,
          order.status ?? '',
          ...(order.items ?? []).map(productName),
        ]
          .join(' ')
          .toLowerCase();

        return !query || haystack.includes(query);
      })
      .sort((a, b) => b.id - a.id);
  }, [orders, search, filter]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={{ maxWidth: 480, margin: '15vh auto', padding: 30 }}>
          <p style={styles.eyebrow}>SANIKA’S BOUTIQUE</p>
          <h1 style={styles.accessTitle}>Preparing your dashboard</h1>
          <p style={styles.subtitle}>Loading your store orders…</p>
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main style={styles.accessPage}>
        <section style={styles.accessBrandPanel}>
          <Link href="/" style={styles.accessBrand}>
            Sanika’s
            <br />
            Boutique
          </Link>

          <div style={{ maxWidth: 430, padding: '45px 0' }}>
            <p
              style={{
                color: '#d8b99e',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 3,
              }}
            >
              THE BOUTIQUE WORKSPACE
            </p>

            <h1 style={styles.accessBrandTitle}>
              Thoughtful style.
              <br />
              Thoughtful service.
            </h1>

            <p
              style={{
                color: '#e0cfc2',
                fontSize: 14,
                lineHeight: 1.9,
                maxWidth: 370,
              }}
            >
              Your dedicated space to look after orders, care for customers,
              and make every boutique experience special.
            </p>

            <div
              style={{
                marginTop: 32,
                width: 64,
                height: 2,
                background: '#c8a17f',
              }}
            />
          </div>

          <p style={{ color: '#d1bfb1', fontSize: 10, letterSpacing: 1.5 }}>
            SANIKA’S BOUTIQUE · ADMINISTRATION
          </p>
        </section>

        <section style={styles.accessContent}>
          <div style={styles.accessInner}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: '#eee3d7',
                color: '#654936',
                fontSize: 25,
                marginBottom: 28,
              }}
              aria-hidden="true"
            >
              ♡
            </div>

            <p style={styles.eyebrow}>PRIVATE ADMIN AREA</p>

            <h2 style={styles.accessTitle}>
              A little space
              <br />
              just for the team.
            </h2>

            <p style={{ ...styles.subtitle, marginBottom: 28 }}>
              Sign in with an administrator account to access order
              management. Your account must have the ADMIN role on the server.
            </p>

            <Link href="/login" style={styles.accessButton}>
              SIGN IN TO YOUR ACCOUNT
              <span aria-hidden="true">→</span>
            </Link>

            <Link href="/" style={styles.accessSecondary}>
              ← Return to the boutique
            </Link>

            <div
              style={{
                borderTop: '1px solid #e7dcd1',
                marginTop: 30,
                paddingTop: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#8a7a6d',
                fontSize: 11,
                lineHeight: 1.8,
              }}
            >
              <span style={{ fontSize: 19 }} aria-hidden="true">
                ◈
              </span>
              <span>
                <strong style={{ color: '#5c4738' }}>
                  Protected workspace
                </strong>
                <br />
                Administrator permissions are verified by the server.
              </span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <aside className="boutique-sidebar" style={styles.sidebar}>
        <div>
          <Link href="/" style={styles.brand}>
            Sanika’s
            <br />
            Boutique
          </Link>
          <p style={styles.brandCaption}>THOUGHTFUL STYLE, EVERYDAY</p>
        </div>

        <div>
          <p style={styles.sideLabel}>WORKSPACE</p>
          <Link href="/admin/orders" style={styles.sideLink}>
            ◈ &nbsp; Orders management
          </Link>
          <Link href="/" style={styles.sideLinkMuted}>
            ↗ &nbsp; View storefront
          </Link>
        </div>

        <div style={styles.sideBottom}>
          <div style={{ color: '#f4e7da', fontWeight: 700 }}>
            Store administration
          </div>
          <div>Manage orders with care.</div>
        </div>
      </aside>

      <div className="boutique-main" style={styles.main}>
        <header style={styles.topbar}>
          <div style={styles.breadcrumb}>Workspace&nbsp; / &nbsp;Orders</div>
          <Link href="/" style={styles.topLink}>
            ↗ &nbsp; View storefront
          </Link>
        </header>

        <section style={styles.content}>
          <div style={styles.intro}>
            <div>
              <p style={styles.eyebrow}>STORE OVERVIEW</p>
              <h1 style={styles.heading}>Orders dashboard</h1>
              <p style={styles.subtitle}>
                A little overview of what’s happening in your boutique.
              </p>
            </div>

            <button
              type="button"
              style={styles.refresh}
              onClick={() => void loadOrders()}
            >
              ↻ &nbsp; Refresh orders
            </button>
          </div>

          <div style={styles.stats}>
            <article style={styles.statCard}>
              <span style={styles.statLabel}>TOTAL ORDERS</span>
              <strong style={styles.statValue}>{orders.length}</strong>
              <span style={styles.statNote}>All customer purchases</span>
            </article>

            <article style={styles.statCard}>
              <span style={styles.statLabel}>AWAITING CONFIRMATION</span>
              <strong style={styles.statValue}>{pendingCount}</strong>
              <span style={styles.statNote}>Orders marked pending</span>
            </article>

            <article style={styles.statCard}>
              <span style={styles.statLabel}>IN PROGRESS</span>
              <strong style={styles.statValue}>{processingCount}</strong>
              <span style={styles.statNote}>Confirmed through shipping</span>
            </article>

            <article style={styles.statCard}>
              <span style={styles.statLabel}>DELIVERED</span>
              <strong style={styles.statValue}>{deliveredCount}</strong>
              <span style={styles.statNote}>Successfully delivered</span>
            </article>

            <article style={styles.statCard}>
              <span style={styles.statLabel}>CONFIRMED ORDER VALUE</span>
              <strong style={{ ...styles.statValue, fontSize: 23 }}>
                {money(confirmedValue)}
              </strong>
              <span style={styles.statNote}>
                Excludes pending orders
              </span>
            </article>
          </div>

          {error && (
            <div role="alert" style={{ ...styles.message, ...styles.error }}>
              {error}
            </div>
          )}

          {notice && (
            <div role="status" style={{ ...styles.message, ...styles.success }}>
              {notice}
            </div>
          )}

          <div style={styles.toolbar}>
            <input
              aria-label="Search orders"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="⌕  Search order number, customer or product…"
              style={styles.search}
            />

            <div style={styles.filterWrap}>
              {['ALL', ...STATUSES].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  style={
                    filter === status ? styles.filterActive : styles.filter
                  }
                >
                  {status === 'ALL' ? 'All orders' : status}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.tableShell}>
            {filteredOrders.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontSize: 29, marginBottom: 12 }}>◇</div>
                <strong style={{ color: '#49372e' }}>
                  {orders.length === 0
                    ? 'No orders yet'
                    : 'No matching orders'}
                </strong>
                <div>
                  {orders.length === 0
                    ? 'Customer purchases will appear here.'
                    : 'Try another search term or status filter.'}
                </div>
              </div>
            ) : (
              <div style={styles.tableScroll}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ORDER</th>
                      <th style={styles.th}>CUSTOMER</th>
                      <th style={styles.th}>ITEMS</th>
                      <th style={styles.th}>TOTAL</th>
                      <th style={styles.th}>STATUS</th>
                      <th style={styles.th}>UPDATE STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td style={styles.td}>
                          <div style={styles.orderNumber}>#{order.id}</div>
                          <div style={styles.secondaryText}>
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString(
                                  'en-IN',
                                  {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  },
                                )
                              : 'Date unavailable'}
                          </div>
                        </td>

                        <td style={styles.td}>
                          <div style={styles.customerName}>
                            {order.customerName ??
                              order.user?.name ??
                              'Customer'}
                          </div>
                          <div style={styles.secondaryText}>
                            {order.email ?? order.user?.email ?? 'No email'}
                          </div>
                          <div style={styles.secondaryText}>
                            {[order.city, order.pincode]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </td>

                        <td style={{ ...styles.td, maxWidth: 220 }}>
                          {(order.items ?? []).map((item, index) => (
                            <div
                              key={item.id ?? `${order.id}-${index}`}
                              style={styles.itemLine}
                            >
                              {productName(item)}
                              {(item.variant?.size ?? item.size)
                                ? ` · ${item.variant?.size ?? item.size}`
                                : ''}
                              {' × '}
                              {item.quantity ?? 1}
                            </div>
                          ))}
                          {(!order.items || order.items.length === 0) && (
                            <span style={styles.secondaryText}>
                              No item details
                            </span>
                          )}
                        </td>

                        <td style={styles.td}>
                          <strong style={{ color: '#49372e', fontSize: 13 }}>
                            {money(order.total)}
                          </strong>
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              ...statusStyle(order.status),
                            }}
                          >
                            {order.status ?? 'UNKNOWN'}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <select
                            aria-label={`Update status for order ${order.id}`}
                            value={
                              STATUSES.includes(order.status as OrderStatus)
                                ? order.status
                                : 'PENDING'
                            }
                            disabled={updatingId === order.id}
                            onChange={(event) =>
                              void updateStatus(
                                order.id,
                                event.target.value as OrderStatus,
                              )
                            }
                            style={styles.select}
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          {updatingId === order.id && (
                            <div style={styles.secondaryText}>Saving…</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={styles.secondaryText}>
            On smaller screens, scroll the order table horizontally to see all
            columns. Status changes are saved through the admin API.
          </p>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 800px) {
          .boutique-sidebar {
            position: relative !important;
            width: 100% !important;
            padding: 18px 20px !important;
            gap: 17px !important;
          }

          .boutique-sidebar > div:nth-child(2) {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
          }

          .boutique-sidebar > div:nth-child(2) > p {
            width: 100%;
          }

          .boutique-sidebar > div:nth-child(2) > a {
            padding: 9px 10px !important;
          }

          .boutique-sidebar > div:last-child {
            display: none;
          }

          .boutique-main {
            margin-left: 0 !important;
            padding: 0 16px 35px !important;
          }
        }
      `}</style>
    </main>
  );
}
