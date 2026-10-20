
'use client';

import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    isCartLoading,
  } = useCart();

  const router = useRouter();

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <main className="amazon-cart">
      <header className="boutique-navbar">
        <Link href="/" className="boutique-logo">
          SANIKA<span>’S</span> BOUTIQUE
        </Link>

        <nav className="boutique-nav-links">
          <Link href="/">Shop Collection</Link>
          <Link href="/cart" className="boutique-cart-link">
            Bag <span>{totalItems}</span>
          </Link>
        </nav>
      </header>

      <div className="cart-layout">
        <section className="cart-items-panel">
          <h1>Shopping Cart</h1>

          {isCartLoading ? (
            <p>Loading your shopping bag...</p>
          ) : cart.length === 0 ? (
            <div className="empty-cart">
              <h2>Your Sanika’s Boutique cart is empty</h2>
              <p>Discover something beautiful for your wardrobe.</p>
              <Link href="/" className="shop-button">
                Shop now
              </Link>
            </div>
          ) : (
            <>
              <p className="cart-select-all">Items ({cart.length})</p>

              {cart.map((item) => (
                <article className="cart-item" key={item.id}>
                  {item.imageUrl ? (
                    <img
                      className="cart-item-image"
                      src={item.imageUrl}
                      alt={item.name}
                    />
                  ) : (
                    <div className="cart-item-image image-fallback">
                      Boutique
                    </div>
                  )}

                  <div className="cart-item-info">
                    <h3>{item.name}</h3>

                    {item.size && (
                      <p className="item-size">
                        Size: <strong>{item.size}</strong>
                      </p>
                    )}

                    <p className="item-stock">In stock</p>

                    <p className="item-price">
                      ₹{item.price.toLocaleString('en-IN')}
                    </p>

                    <div className="cart-actions">
                      <div className="quantity-control">
                        <button
                          aria-label={`Decrease quantity of ${item.name}${item.size ? ` size ${item.size}` : ''}`}
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            void updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          aria-label={`Increase quantity of ${item.name}${item.size ? ` size ${item.size}` : ''}`}
                          onClick={() =>
                            void updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="remove-button"
                        onClick={() => void removeFromCart(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              <div className="cart-subtotal">
                Subtotal ({totalItems} items):{' '}
                <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
              </div>
            </>
          )}
        </section>

        {cart.length > 0 && (
          <aside className="order-summary">
            <p className="delivery-note">Your order summary</p>

            <h2>Subtotal ({totalItems} items)</h2>

            <p className="summary-total">
              ₹{subtotal.toLocaleString('en-IN')}
            </p>

            <p className="summary-small">
              Delivery charges and any applicable taxes will be calculated at
              checkout.
            </p>

            <button
              className="checkout-button"
              onClick={() => router.push('/checkout')}
              disabled={isCartLoading}
            >
              Proceed to Buy
            </button>

            <Link href="/" className="summary-continue">
              Continue shopping
            </Link>
          </aside>
        )}
      </div>
    </main>
  );
}
