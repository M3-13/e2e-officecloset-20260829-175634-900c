import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { LoginResponse, User } from '../api/types';
import { useAuth } from '../auth/AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setPending(true);
    try {
      await apiFetch<User>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      login(data.access_token, email);
      navigate('/wardrobe', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page">
      <h1 className="page__title">Registrieren</h1>
      <div className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-form__field">
            <span className="auth-form__label">E-Mail</span>
            <input
              className="auth-form__input"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-form__field">
            <span className="auth-form__label">Passwort</span>
            <input
              className="auth-form__input"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="auth-form__field">
            <span className="auth-form__label">Passwort bestätigen</span>
            <input
              className="auth-form__input"
              type="password"
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button className="auth-form__submit" type="submit" disabled={pending}>
            {pending ? 'Registrieren…' : 'Registrieren'}
          </button>
        </form>
        <p className="auth-form__switch">
          Bereits registriert? <Link to="/login">Anmelden</Link>
        </p>
      </div>
    </section>
  );
}
