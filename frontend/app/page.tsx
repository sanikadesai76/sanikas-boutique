
'use client';

import { useEffect, useState } from 'react';
import { useCart } from './context/CartContext';

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  category: string;
  stock: number;
  variants?: {
    id: number;
    size: string;
    stock: number;
  }[];
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  const { cart } = useCart();
  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // Read the logged-in user's name
  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUserName(user.name || '');
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Fetch products from the backend
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load products');
        }

        return response.json();
      })
      .then(setProducts)
      .catch(() =>
        setError('Could not load products. Please try again.'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      
<header className="navbar">
  <a className="brand" href="/">
    Sanika’s Boutique
  </a>

  <span>
    {userName
      ? `Welcome, ${userName}!`
      : 'Thoughtful style, everyday'}
  </span>

  <div className="navbar-actions">
    <a href="/cart">Cart 🛍️ ({cartCount})</a>
    {userName && <a href="/orders">My Orders</a>}

    {userName ? (
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/';
        }}
      >
        Sign out
      </button>
    ) : (
      <a href="/login">Sign in</a>
    )}
  </div>
</header>

      <section className="hero">
        <p className="eyebrow">THE NEW COLLECTION</p>
        <h1>
          Simple styles.
          <br />
          Timeless you.
        </h1>
        <p>Discover pieces made for your everyday moments.</p>
      </section>

      <section className="collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED FOR YOU</p>
            <h2>Our Collection</h2>
          </div>

          <span>{products.length} products</span>
        </div>

        {loading ? (
          <p className="message">Loading products...</p>
        ) : error ? (
          <p className="message">{error}</p>
        ) : products.length === 0 ? (
          <p className="message">New styles coming soon.</p>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <a
                className="product-card"
                key={product.id}
                href={`/products/${product.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div className="product-image">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                    />
                  ) : (
                    <div className="image-placeholder">
                      Sanika’s Boutique
                    </div>
                  )}
                </div>

                <p className="category">{product.category}</p>
                <h3>{product.name}</h3>

                <p className="price">
                  ₹{Number(product.price).toLocaleString('en-IN')}
                </p>

                <p className="stock">
                {(product.variants && product.variants.length > 0
                  ? product.variants.some((variant) => Number(variant.stock) > 0)
                  : Number(product.stock) > 0)
                  ? 'In stock'
                  : 'Sold out'}
              </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <footer>
        © 2026 Sanika’s Boutique. Made with care.
      </footer>
    </main>
  );
}
