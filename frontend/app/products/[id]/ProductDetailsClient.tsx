
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

type ProductVariant = {
  id: number;
  size: string;
  stock: number;
};

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  category: string;
  stock: number;
  variants: ProductVariant[];
};

export default function ProductDetailsClient({ id }: { id: string }) {
  const { addToCart, cart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then((data: Product) => {
        if (cancelled) return;
        setProduct(data);
        setSelectedSize('');
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const hasVariants = (product?.variants.length ?? 0) > 0;

  const selectedVariant = product?.variants.find(
    (variant) => variant.size === selectedSize,
  );

  const availableStock = hasVariants
    ? selectedVariant?.stock ?? 0
    : product?.stock ?? 0;

  async function handleAddToCart() {
    if (!product || adding) return;

    if (hasVariants && !selectedVariant) {
      alert('Please select a size before adding this item to your bag.');
      return;
    }

    if (availableStock <= 0) {
      alert('This item is currently out of stock.');
      return;
    }

    const existingQuantity = cart
      .filter(
        (item) =>
          item.productId === product.id &&
          item.variantId === (selectedVariant?.id ?? null),
      )
      .reduce((sum, item) => sum + item.quantity, 0);

    if (existingQuantity + quantity > availableStock) {
      setAdded(false);
      alert(
        `Only ${Math.max(0, availableStock - existingQuantity)} more item(s) available for this selection.`,
      );
      return;
    }

    setAdding(true);
    setAdded(false);

    try {
      await addToCart(
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          imageUrl: product.imageUrl,
          variantId: selectedVariant?.id ?? null,
          size: selectedVariant?.size ?? null,
        },
        quantity,
      );

      setAdded(true);
    } catch (error) {
      console.error('Unable to add item to bag:', error);
      alert('Unable to add this item. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <main className="product-state">
        Loading your selection...
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-state">
        Product not found. <Link href="/">Return to collection</Link>
      </main>
    );
  }

  return (
    <main className="boutique-page">
      <header className="boutique-navbar">
        <Link href="/" className="boutique-logo">
          Sanika’s Boutique
        </Link>

        <nav className="boutique-nav-links">
          <Link href="/">Shop Collection</Link>
          <Link href="/cart" className="boutique-cart-link">
            Bag <span>{cartCount}</span>
          </Link>
        </nav>
      </header>

      <div className="product-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>{product.category}</span>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      <section className="product-detail-layout">
        <div className="product-detail-image-wrap">
          {product.imageUrl ? (
            <img
              className="product-detail-image"
              src={product.imageUrl}
              alt={product.name}
            />
          ) : (
            <div className="product-detail-placeholder">
              Sanika’s Boutique
            </div>
          )}
          <span className="image-caption">THOUGHTFULLY CURATED</span>
        </div>

        <div className="product-detail-info">
          <p className="product-detail-category">{product.category}</p>
          <h1>{product.name}</h1>

          <p className="product-detail-description">
            {product.description ||
              'A beautiful addition to your everyday wardrobe.'}
          </p>

          <div className="product-detail-price">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </div>
          <p className="tax-note">Inclusive of listed price</p>

          <div className="product-detail-divider" />

          {hasVariants ? (
            <>
              <p className="quantity-label">Select size</p>

              <div className="product-size-options">
                {product.variants.map((variant) => {
                  const isSelected = selectedSize === variant.size;
                  const isOutOfStock = variant.stock <= 0;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={isOutOfStock || adding}
                      aria-pressed={isSelected}
                      className={[
                        'product-size-option',
                        isSelected ? 'selected' : '',
                        isOutOfStock ? 'out-of-stock' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        setSelectedSize(variant.size);
                        setQuantity(1);
                        setAdded(false);
                      }}
                    >
                      {variant.size}
                    </button>
                  );
                })}
              </div>

              {!selectedSize && (
                <p className="product-size-hint">
                  Please choose your size.
                </p>
              )}
            </>
          ) : (
            <p className="product-size-hint">
              No sizes have been configured for this product yet.
            </p>
          )}

          <p
            className={
              availableStock > 0
                ? 'availability available'
                : 'availability unavailable'
            }
          >
            <span />
            {hasVariants
              ? !selectedSize
                ? 'Select a size to check availability'
                : availableStock > 0
                  ? `${availableStock} available in size ${selectedSize}`
                  : `Size ${selectedSize} is sold out`
              : product.stock > 0
                ? `In stock · ${product.stock} available`
                : 'Currently sold out'}
          </p>

          {availableStock > 0 && (
            <>
              <label className="quantity-label" htmlFor="product-quantity">
                Quantity
              </label>

              <select
                id="product-quantity"
                className="product-quantity-select"
                value={quantity}
                disabled={adding}
                onChange={(e) => {
                  setQuantity(Number(e.target.value));
                  setAdded(false);
                }}
              >
                {Array.from(
                  { length: Math.min(availableStock, 10) },
                  (_, i) => i + 1,
                ).map((number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>

              <button
                className="product-add-button"
                onClick={handleAddToCart}
                disabled={adding}
              >
                {adding
                  ? 'Adding...'
                  : added
                    ? '✓ Added to your bag'
                    : 'Add to Bag'}
              </button>

              {added && (
                <Link href="/cart" className="view-bag-link">
                  View your bag →
                </Link>
              )}
            </>
          )}

          <div className="product-promise">
            <p>♡ Carefully selected styles</p>
            <p>✧ Made for your everyday moments</p>
            <p>↗ Easy access to your shopping bag</p>
          </div>

          <Link href="/" className="back-to-collection">
            ← Back to the collection
          </Link>
        </div>
      </section>

      <footer className="boutique-footer">
        <Link href="/" className="footer-logo">
          Sanika’s Boutique
        </Link>
        <p>Thoughtful style, everyday.</p>
        <span>© 2026 Sanika’s Boutique</span>
      </footer>
    </main>
  );
}
