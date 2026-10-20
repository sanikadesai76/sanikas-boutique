
'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message || 'Unable to create your account.',
        );
      }

      if (!data.accessToken || !data.user) {
        throw new Error('Invalid signup response from the server.');
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
            <p className="login-eyebrow">THOUGHTFUL STYLE, EVERYDAY</p>
            <h1>Your style.<br />Your <em>story.</em></h1>
            <p className="login-brand-description">
              Create your account to keep your cart saved and make
              every shopping experience personal.
            </p>
          </div>

          <p className="login-copyright">© 2026 Sanika’s Boutique</p>
        </div>

        <div className="login-form-panel">
          <p className="login-section-label">JOIN OUR COMMUNITY</p>
          <h2>Create account</h2>
          <p className="login-intro">
            Enter your details to get started.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
              />
            </div>

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
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
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
              {loading ? 'Creating account…' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="login-signup-prompt">
            <p>Already have an account?</p>
            <Link href="/login">Sign in</Link>
          </div>

          <Link href="/" className="login-back-link">
            ← Continue shopping
          </Link>
        </div>
      </section>
    </main>
  );
}
