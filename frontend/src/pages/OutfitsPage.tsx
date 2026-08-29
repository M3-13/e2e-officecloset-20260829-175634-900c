import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { Outfit } from '../api/types';
import '../styles/outfits.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function resolveImageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Outfit | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Outfit[]>('/api/outfits')
      .then((data) => {
        if (!cancelled) {
          setOutfits(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Outfits konnten nicht geladen werden',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewing) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewing(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  const handleDelete = useCallback(async (outfit: Outfit) => {
    if (!window.confirm(`Outfit „${outfit.name}“ wirklich löschen?`)) {
      return;
    }
    setDeletingId(outfit.id);
    setDeleteError(null);
    try {
      await apiFetch<void>(`/api/outfits/${outfit.id}`, { method: 'DELETE' });
      setOutfits((prev) => prev.filter((o) => o.id !== outfit.id));
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : 'Outfit konnte nicht gelöscht werden',
      );
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <section className="page">
      <div className="outfits-header">
        <h1 className="page__title">Outfits</h1>
        <Link to="/outfits/new" className="oc-btn oc-btn--primary">
          Neues Outfit
        </Link>
      </div>

      {deleteError && (
        <p className="oc-error" role="alert">
          {deleteError}
        </p>
      )}

      {loading && <p className="oc-loading">Lade Outfits…</p>}

      {!loading && error && (
        <div className="oc-empty">
          <p className="oc-error" role="alert">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && outfits.length === 0 && (
        <div className="oc-empty">
          <span className="oc-empty__icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
            </svg>
          </span>
          <p className="oc-empty__text">Noch keine Outfits gespeichert.</p>
          <Link to="/outfits/new" className="oc-btn oc-btn--primary">
            Erstes Outfit erstellen
          </Link>
        </div>
      )}

      {!loading && !error && outfits.length > 0 && (
        <ul className="outfit-grid">
          {outfits.map((outfit) => (
            <li key={outfit.id} className="outfit-card">
              <div className="outfit-card__thumbs">
                {outfit.items.slice(0, 4).map((item) => (
                  <img
                    key={item.id}
                    className="outfit-card__thumb"
                    src={resolveImageUrl(item.image_url)}
                    alt={item.name}
                    title={item.name}
                  />
                ))}
                {outfit.items.length > 4 && (
                  <span className="outfit-card__more">
                    +{outfit.items.length - 4}
                  </span>
                )}
              </div>
              <div className="outfit-card__body">
                <h2 className="outfit-card__name">{outfit.name}</h2>
                <p className="outfit-card__meta">
                  {outfit.items.length}{' '}
                  {outfit.items.length === 1 ? 'Teil' : 'Teile'}
                </p>
              </div>
              <div className="outfit-card__actions">
                <button
                  type="button"
                  className="oc-icon-btn"
                  onClick={() => setViewing(outfit)}
                  aria-label={`${outfit.name} ansehen`}
                  title="Ansehen"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="oc-icon-btn oc-icon-btn--danger"
                  onClick={() => handleDelete(outfit)}
                  disabled={deletingId === outfit.id}
                  aria-label={`${outfit.name} löschen`}
                  title="Löschen"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewing && (
        <div className="oc-modal__overlay" onClick={() => setViewing(null)}>
          <div
            className="oc-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Outfit ${viewing.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="oc-modal__close"
              onClick={() => setViewing(null)}
              aria-label="Schließen"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 className="oc-modal__title">{viewing.name}</h2>
            <ul className="oc-modal__items">
              {viewing.items.map((item) => (
                <li key={item.id} className="oc-modal__item">
                  <img src={resolveImageUrl(item.image_url)} alt={item.name} />
                  <div>
                    <span className="oc-modal__item-name">{item.name}</span>
                    <span className="oc-modal__item-category">
                      {item.category}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
