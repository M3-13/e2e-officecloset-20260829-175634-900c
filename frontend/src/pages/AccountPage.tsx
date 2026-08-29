import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function AccountPage() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await apiFetch<void>('/api/auth/me', { method: 'DELETE' });
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Das Konto konnte nicht gelöscht werden.',
      );
      setConfirmingDelete(false);
      setDeleting(false);
    }
  }

  return (
    <section className="page">
      <h1 className="page__title">Konto</h1>
      <div className="account-card">
        {email && <p className="account-card__email">Angemeldet als {email}</p>}

        <div className="account-card__actions">
          <button
            type="button"
            className="account-card__button account-card__button--secondary"
            onClick={handleLogout}
          >
            Abmelden
          </button>
        </div>

        <div className="account-card__danger-zone">
          {confirmingDelete ? (
            <>
              <p className="account-card__warning">
                Möchten Sie Ihr Konto wirklich löschen? Alle Kleidungsstücke,
                Outfits und Bilder werden dauerhaft entfernt.
              </p>
              {error && (
                <p className="auth-form__error" role="alert">
                  {error}
                </p>
              )}
              <div className="account-card__confirm-actions">
                <button
                  type="button"
                  className="account-card__button account-card__button--danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Löschen…' : 'Endgültig löschen'}
                </button>
                <button
                  type="button"
                  className="account-card__button account-card__button--secondary"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Abbrechen
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="account-card__button account-card__button--danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Konto löschen
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
