import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { apiFetch, getToken } from '../api/client';
import type { Category, ClothingItem } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import './wardrobe.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const CATEGORIES: Category[] = ['oberteil', 'hose', 'kleid', 'schuhe', 'accessoire'];

function categoryLabel(category: Category): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function resolveImageUrl(imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }
  return imageUrl.startsWith('/')
    ? `${API_BASE}${imageUrl}`
    : `${API_BASE}/${imageUrl}`;
}

function ItemImage({ item }: { item: ClothingItem }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!item.image_url) {
      setFailed(true);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadImage(): Promise<void> {
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(resolveImageUrl(item.image_url), { headers });
        if (!res.ok) {
          throw new Error(`image request failed: ${res.status}`);
        }
        const blob = await res.blob();
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void loadImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [item.image_url]);

  if (failed || !src) {
    return <div className="wardrobe-card__image wardrobe-card__image--placeholder" />;
  }

  return <img className="wardrobe-card__image" src={src} alt={item.name} />;
}

export default function WardrobePage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClothingItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ClothingItem[]>('/api/wardrobe/items');
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Garderobe konnte nicht geladen werden.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void load();
    }
  }, [token, load]);

  const visibleItems = filter
    ? items.filter((item) => item.category === filter)
    : items;

  function openCreate(): void {
    setEditing(null);
    setName('');
    setCategory('');
    setFormOpen(true);
  }

  function openEdit(item: ClothingItem): void {
    setEditing(item);
    setName(item.name);
    setCategory(item.category);
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Bitte einen Namen angeben.');
      return;
    }
    if (!category) {
      setError('Bitte eine Kategorie wählen.');
      return;
    }
    const file = fileInputRef.current?.files?.[0] ?? null;
    if (!editing && !file) {
      setError('Bitte ein Bild auswählen.');
      return;
    }

    const data = new FormData();
    data.append('name', trimmedName);
    data.append('category', category);
    if (file) {
      data.append('image', file);
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch<ClothingItem>(`/api/wardrobe/items/${editing.id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        await apiFetch<ClothingItem>('/api/wardrobe/items', {
          method: 'POST',
          body: data,
        });
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: ClothingItem): Promise<void> {
    setError(null);
    try {
      await apiFetch<void>(`/api/wardrobe/items/${item.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    }
  }

  return (
    <section className="wardrobe">
      <h1 className="page__title">Garderobe</h1>

      <div className="wardrobe__toolbar">
        <div className="wardrobe__filters" role="group" aria-label="Nach Kategorie filtern">
          <button
            type="button"
            className={`wardrobe__chip${filter === null ? ' wardrobe__chip--active' : ''}`}
            aria-pressed={filter === null}
            onClick={() => setFilter(null)}
          >
            Alle
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`wardrobe__chip${filter === cat ? ' wardrobe__chip--active' : ''}`}
              aria-pressed={filter === cat}
              onClick={() => setFilter(cat)}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          Hinzufügen
        </button>
      </div>

      {error && (
        <div className="wardrobe__toast wardrobe__toast--error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="wardrobe__status">Garderobe wird geladen …</p>
      ) : visibleItems.length === 0 ? (
        <div className="wardrobe__empty">
          <p>
            {items.length === 0
              ? 'Deine Garderobe ist noch leer. Lege dein erstes Kleidungsstück an.'
              : 'Keine Kleidungsstücke in dieser Kategorie.'}
          </p>
          {items.length === 0 && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              Erstes Teil hinzufügen
            </button>
          )}
        </div>
      ) : (
        <ul className="wardrobe__grid">
          {visibleItems.map((item) => (
            <li key={item.id} className="wardrobe-card" data-testid={`item-${item.id}`}>
              <ItemImage item={item} />
              <div className="wardrobe-card__body">
                <h3 className="wardrobe-card__name">{item.name}</h3>
                <span className="wardrobe-card__category">{categoryLabel(item.category)}</span>
              </div>
              <div className="wardrobe-card__actions">
                <button type="button" className="btn btn--secondary" onClick={() => openEdit(item)}>
                  Bearbeiten
                </button>
                <button type="button" className="btn btn--danger" onClick={() => handleDelete(item)}>
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <div className="modal-overlay" role="presentation" onClick={closeForm}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'Kleidungsstück bearbeiten' : 'Kleidungsstück anlegen'}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal__close"
              aria-label="Schließen"
              onClick={closeForm}
            >
              ×
            </button>
            <h2 className="modal__title">
              {editing ? 'Kleidungsstück bearbeiten' : 'Neues Kleidungsstück'}
            </h2>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="field">
                <label className="field__label" htmlFor="wardrobe-name">
                  Name
                </label>
                <input
                  id="wardrobe-name"
                  className="field__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Schwarzes Abendkleid"
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="wardrobe-category">
                  Kategorie
                </label>
                <select
                  id="wardrobe-category"
                  className="field__select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category | '')}
                >
                  <option value="">Kategorie wählen …</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="wardrobe-image">
                  Bild
                </label>
                <input
                  id="wardrobe-image"
                  ref={fileInputRef}
                  className="field__file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
              </div>
              {editing && (
                <p className="field__hint">Ohne neues Bild bleibt das bisherige Bild erhalten.</p>
              )}
              <div className="modal__actions">
                <button type="button" className="btn btn--secondary" onClick={closeForm}>
                  Abbrechen
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
