
"use client";

import { useCallback, useEffect, useState } from "react";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

type Variant = {
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
  stock?: number;
  variants: Variant[];
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  category: "",
  stock: "0",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [token, setToken] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [variantSize, setVariantSize] = useState("");
  const [variantStock, setVariantStock] = useState("0");
  const [variantSaving, setVariantSaving] = useState(false);

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || `Request failed (${response.status})`
        );
      }

      return data;
    },
    [token]
  );

  const loadProducts = useCallback(async () => {
    setError("");

    try {
      const data = await request("/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load products."
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("user");

    if (!savedToken) {
      setError("Please log in with your admin account first.");
      setLoading(false);
      return;
    }

    try {
      const user = savedUser ? JSON.parse(savedUser) : null;

      if (user?.role !== "ADMIN") {
        setError(
          "Admin access required. Please log in with your admin account."
        );
        setLoading(false);
        return;
      }
    } catch {
      setError("Could not verify your account. Please log in again.");
      setLoading(false);
      return;
    }

    setToken(savedToken);
    setAuthorized(true);
  }, []);

  useEffect(() => {
    if (authorized && token) {
      void loadProducts();
    }
  }, [authorized, token, loadProducts]);

  function startEdit(product: Product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      imageUrl: product.imageUrl || "",
      category: product.category,
      stock: String(product.stock ?? 0),
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveProduct(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim() || !form.category.trim()) {
      setError("Product name and category are required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid non-negative price.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a non-negative whole number.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      imageUrl: form.imageUrl.trim() || null,
      category: form.category.trim(),
      ...(!editingId ? { stock } : {}),
    };

    setSaving(true);

    try {
      await request(
        editingId ? `/products/${editingId}` : "/products",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setMessage(
        editingId
          ? "Product updated successfully."
          : "Product created successfully."
      );

      resetForm();
      await loadProducts();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? Products linked to carts or order history cannot be deleted.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      await request(`/products/${product.id}`, {
        method: "DELETE",
      });

      setMessage(`"${product.name}" was deleted.`);

      if (editingId === product.id) {
        resetForm();
      }

      await loadProducts();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete product."
      );
    }
  }

  async function addVariant(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!variantProduct) return;

    const size = variantSize.trim();
    const stock = Number(variantStock);

    if (!size) {
      setError("Enter a size, such as S, M, L or Free Size.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Variant stock must be a non-negative whole number.");
      return;
    }

    setVariantSaving(true);
    setError("");
    setMessage("");

    try {
      await request(`/products/${variantProduct.id}/variants`, {
        method: "POST",
        body: JSON.stringify({ size, stock }),
      });

      setMessage(
        `Size ${size} added to ${variantProduct.name}.`
      );

      setVariantProduct(null);
      setVariantSize("");
      setVariantStock("0");

      await loadProducts();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not add size."
      );
    } finally {
      setVariantSaving(false);
    }
  }

  async function updateVariantStock(
    product: Product,
    variant: Variant
  ) {
    const entered = window.prompt(
      `Enter new stock for ${product.name} — ${variant.size}:`,
      String(variant.stock)
    );

    if (entered === null) return;

    const stock = Number(entered);

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a non-negative whole number.");
      return;
    }

    setError("");
    setMessage("");

    try {
      await request(
        `/products/${product.id}/variants/${variant.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ stock }),
        }
      );

      setMessage(`Stock updated for size ${variant.size}.`);
      await loadProducts();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update stock."
      );
    }
  }

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();

    return (
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  });

  const totalUnits = products.reduce(
    (sum, product) =>
      sum +
      (product.variants.length
        ? product.variants.reduce(
            (variantSum, variant) => variantSum + variant.stock,
            0
          )
        : product.stock ?? 0),
    0
  );

  return (
    <main className="admin-products-page">
      <div>
        <header className="admin-products-heading">
          <div>
            <p>
              SANIKA&apos;S BOUTIQUE · ADMINISTRATION
            </p>

            <h1>Product Management</h1>

            <p>
              Manage your collection, product details, sizes and inventory.
            </p>
          </div>

          <a href="/admin/orders">View Orders →</a>
        </header>

        <section className="admin-products-stats">
          {[
            { label: "Total Products", value: products.length },
            { label: "Inventory Units", value: totalUnits },
            {
              label: "Categories",
              value: new Set(products.map((p) => p.category)).size,
            },
          ].map((stat) => (
            <div key={stat.label}>
              <p>{stat.label}</p>
              <p>{stat.value}</p>
            </div>
          ))}
        </section>

        {(message || error) && (
          <div
            role="status"
            className={`admin-products-message ${
              error ? "is-error" : "is-success"
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="admin-products-panel">
          <div>
            <p className="admin-products-eyebrow">
              {editingId ? "EDIT COLLECTION" : "NEW COLLECTION"}
            </p>

            <h2>
              {editingId ? "Update Product" : "Add a Product"}
            </h2>
          </div>

          <form
            onSubmit={saveProduct}
            className="admin-products-form"
          >
            <label className="admin-products-field">
              Product Name *
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="e.g. Floral Cotton Kurti"
              />
            </label>

            <label className="admin-products-field">
              Category *
              <input
                required
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                placeholder="e.g. Kurtis"
              />
            </label>

            <label className="admin-products-field">
              Price (₹) *
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                placeholder="999"
              />
            </label>

            {!editingId && (
              <label className="admin-products-field">
                Initial Stock
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: e.target.value })
                  }
                />
              </label>
            )}

            <label className="admin-products-field full-width">
              Image URL
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                placeholder="https://example.com/product-image.jpg"
              />
            </label>

            <label className="admin-products-field full-width">
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the fabric, fit and details..."
              />
            </label>

            <div className="admin-products-actions full-width">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Product"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="admin-products-cancel"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <div className="admin-products-toolbar">
            <div>
              <h2>Your Collection</h2>
              <p>
                {filteredProducts.length} product
                {filteredProducts.length === 1 ? "" : "s"}
              </p>
            </div>

            <input
              className="admin-products-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or categories..."
            />
          </div>

          {loading ? (
            <div className="admin-products-empty">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="admin-products-empty">
              <p>No products found</p>
              <p>Add a product above or change your search.</p>
            </div>
          ) : (
            <div className="admin-products-grid">
              {filteredProducts.map((product) => {
                const stock = product.variants.length
                  ? product.variants.reduce(
                      (sum, variant) => sum + variant.stock,
                      0
                    )
                  : product.stock ?? 0;

                return (
                  <article
                    key={product.id}
                    className="admin-product-card"
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div className="admin-product-image">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                        />
                      </div>
                    ) : (
                      <div className="admin-product-image admin-product-image-placeholder">
                        ♡
                      </div>
                    )}

                    <div className="admin-product-content">
                      <p className="admin-product-category">
                        {product.category}
                      </p>

                      <h3>{product.name}</h3>

                      <p className="admin-product-price">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </p>

                      {product.description && (
                        <p className="admin-product-description">
                          {product.description}
                        </p>
                      )}

                      <div className="admin-product-meta">
                        <span>Total inventory</span>
                        <span>{stock} units</span>
                      </div>

                      <div className="admin-product-variants">
                        <p>Sizes &amp; stock</p>

                        {product.variants.length === 0 ? (
                          <p>No size variants added.</p>
                        ) : (
                          <div className="admin-product-size-list">
                            {product.variants.map((variant) => (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() =>
                                  void updateVariantStock(product, variant)
                                }
                                title="Click to update stock"
                              >
                                {variant.size}: {variant.stock} ✎
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          className="admin-product-add-size"
                          onClick={() => {
                            setVariantProduct(product);
                            setVariantSize("");
                            setVariantStock("0");
                            setError("");
                            setMessage("");
                          }}
                        >
                          + Add size variant
                        </button>
                      </div>

                      <div className="admin-product-actions">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="admin-product-delete"
                          onClick={() => void deleteProduct(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {variantProduct && (
          <div className="admin-products-modal">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="variant-title"
              className="admin-products-modal-card"
            >
              <p className="admin-products-eyebrow">INVENTORY</p>

              <h2 id="variant-title">Add Size Variant</h2>
              <p>{variantProduct.name}</p>

              <form onSubmit={addVariant}>
                <label className="admin-products-field">
                  Size *
                  <input
                    required
                    autoFocus
                    value={variantSize}
                    onChange={(e) => setVariantSize(e.target.value)}
                    placeholder="S, M, L, XL or Free Size"
                  />
                </label>

                <label className="admin-products-field">
                  Initial stock *
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={variantStock}
                    onChange={(e) => setVariantStock(e.target.value)}
                  />
                </label>

                <div className="admin-products-actions">
                  <button type="submit" disabled={variantSaving}>
                    {variantSaving ? "Adding..." : "Add Variant"}
                  </button>

                  <button
                    type="button"
                    className="admin-products-cancel"
                    onClick={() => setVariantProduct(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
