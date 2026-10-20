
'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to sign in. Please try again.',
        );
      }

      if (!data.accessToken || !data.user) {
        throw new Error('Invalid login response from the server.');
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      window.location.href = '/';
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-panel">
          <Link href="/" className="login-brand-name">
            Sanika’s Boutique
          </Link>

          <div className="login-brand-content">
            <p className="login-eyebrow">
              THOUGHTFUL STYLE, EVERYDAY
            </p>

            <h1>
              Style that feels
              <br />
              like <em>you.</em>
            </h1>

            <p className="login-brand-description">
              Discover your favourites, revisit your saved cart, and
              make every purchase feel personal.
            </p>
          </div>

          <p className="login-copyright">
            © 2026 Sanika’s Boutique
          </p>
        </div>

        <div className="login-form-panel">
          <p className="login-section-label">YOUR ACCOUNT</p>

          <h2>Welcome back</h2>

          <p className="login-intro">
            Sign in to continue your shopping journey.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p role="alert" className="login-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading ? 'Signing in…' : 'SIGN IN'}
            </button>
          </form>

          <div className="login-signup-prompt">
            <p>Want to keep your favourites saved?</p>
            <Link href="/signup">Create an account</Link>
          </div>

          <Link href="/" className="login-back-link">
            ← Continue shopping
          </Link>
        </div>
      </section>
    </main>
  );
}
