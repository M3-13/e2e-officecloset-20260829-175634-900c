import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { ClothingItem, Outfit } from '../api/types';
import '../styles/outfits.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function resolveImageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

export default function OutfitCreatorPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ClothingItem[]>('/api/wardrobe/items')
      .then((data) => {
        if (!cancelled) {
          setItems(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Garderobe konnte nicht geladen werden',
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

  const toggleItem = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const canSave = name.trim().length > 0 && selectedIds.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch<Outfit>('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), item_ids: selectedIds }),
      });
      navigate('/outfits');
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : 'Outfit konnte nicht gespeichert werden',
      );
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <Link to="/outfits" className="oc-backlink">
        Zurück zu Outfits
      </Link>
      <h1 className="page__title">Neues Outfit</h1>

      {loading && <p className="oc-loading">Lade Garderobe…</p>}

      {!loading && loadError && (
        <div className="oc-empty">
          <p className="oc-error" role="alert">
            {loadError}
          </p>
        </div>
      )}

      {!loading && !loadError && items.length === 0 && (
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
          <p className="oc-empty__text">
            Deine Garderobe ist leer. Füge zuerst Kleidungsstücke hinzu.
          </p>
          <Link to="/wardrobe" className="oc-btn oc-btn--primary">
            Zur Garderobe
          </Link>
        </div>
      )}

      {!loading && !loadError && items.length > 0 && (
        <div className="oc-creator">
          <div className="oc-creator__selection">
            <h2 className="oc-section-title">Teile auswählen</h2>
            <p className="oc-muted">
              Tippe auf ein Kleidungsstück, um es auszuwählen.
            </p>
            <div className="oc-selection__grid">
              {items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`oc-item${isSelected ? ' oc-item--selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => toggleItem(item.id)}
                  >
                    <span className="oc-item__media">
                      <img src={resolveImageUrl(item.image_url)} alt={item.name} />
                      <span className="oc-item__check" aria-hidden="true">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    </span>
                    <span className="oc-item__body">
                      <span className="oc-item__name">{item.name}</span>
                      <span className="oc-item__category">{item.category}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="oc-preview">
            <h2 className="oc-preview__title">
              Vorschau{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </h2>
            {selectedItems.length === 0 ? (
              <p className="oc-muted">Noch keine Teile ausgewählt.</p>
            ) : (
              <ul className="oc-preview__list">
                {selectedItems.map((item) => (
                  <li key={item.id} className="oc-preview__row">
                    <img src={resolveImageUrl(item.image_url)} alt="" />
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            )}

            <label className="oc-field">
              <span className="oc-field__label">Outfit-Name</span>
              <input
                className="oc-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Abend-Look"
                maxLength={120}
              />
            </label>

            {saveError && (
              <p className="oc-error" role="alert">
                {saveError}
              </p>
            )}

            <button
              type="button"
              className="oc-btn oc-btn--primary"
              onClick={handleSave}
              disabled={!canSave}
            >
              {saving ? 'Speichere…' : 'Outfit speichern'}
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}
