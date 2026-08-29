import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/client';
import type { ClothingItem, Outfit } from '../api/types';
import OutfitCreatorPage from '../pages/OutfitCreatorPage';
import OutfitsPage from '../pages/OutfitsPage';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

const wardrobeItems: ClothingItem[] = [
  { id: 1, name: 'Rotes Kleid', category: 'kleid', image_url: '/api/wardrobe/items/1/image' },
  { id: 2, name: 'Goldene Schuhe', category: 'schuhe', image_url: '/api/wardrobe/items/2/image' },
  { id: 3, name: 'Perlenkette', category: 'accessoire', image_url: '/api/wardrobe/items/3/image' },
];

const outfit: Outfit = {
  id: 10,
  name: 'Abend-Look',
  items: [wardrobeItems[0], wardrobeItems[1]],
};

function renderCreator() {
  return render(
    <MemoryRouter initialEntries={['/outfits/new']}>
      <Routes>
        <Route path="/outfits/new" element={<OutfitCreatorPage />} />
        <Route path="/outfits" element={<div>Outfits-Liste</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderOutfits() {
  return render(
    <MemoryRouter initialEntries={['/outfits']}>
      <OutfitsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('OutfitCreatorPage', () => {
  it('loads the wardrobe and lists its items', async () => {
    mockApiFetch.mockResolvedValueOnce(wardrobeItems);
    renderCreator();

    expect(await screen.findByText('Rotes Kleid')).toBeInTheDocument();
    expect(screen.getByText('Goldene Schuhe')).toBeInTheDocument();
    expect(screen.getByText('Perlenkette')).toBeInTheDocument();
  });

  it('keeps save disabled until a name and at least one item are chosen', async () => {
    mockApiFetch.mockResolvedValueOnce(wardrobeItems);
    renderCreator();
    await screen.findByText('Rotes Kleid');

    const saveButton = screen.getByRole('button', {
      name: 'Outfit speichern',
    }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Rotes Kleid/ }));
    expect(saveButton.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('z. B. Abend-Look'), {
      target: { value: 'Abend-Look' },
    });
    expect(saveButton.disabled).toBe(false);
  });

  it('saves a multi-item outfit via POST /api/outfits and navigates to the list', async () => {
    mockApiFetch.mockResolvedValueOnce(wardrobeItems);
    mockApiFetch.mockResolvedValueOnce(outfit);
    renderCreator();
    await screen.findByText('Rotes Kleid');

    fireEvent.click(screen.getByRole('button', { name: /Rotes Kleid/ }));
    fireEvent.click(screen.getByRole('button', { name: /Goldene Schuhe/ }));
    fireEvent.change(screen.getByPlaceholderText('z. B. Abend-Look'), {
      target: { value: 'Abend-Look' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Outfit speichern' }));

    expect(await screen.findByText('Outfits-Liste')).toBeInTheDocument();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/outfits',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Abend-Look', item_ids: [1, 2] }),
      }),
    );
  });
});

describe('OutfitsPage', () => {
  it('lists saved outfits and shows the image and name of each part', async () => {
    mockApiFetch.mockResolvedValueOnce([outfit]);
    renderOutfits();

    expect(await screen.findByText('Abend-Look')).toBeInTheDocument();
    expect(screen.getByAltText('Rotes Kleid')).toBeInTheDocument();
    expect(screen.getByAltText('Goldene Schuhe')).toBeInTheDocument();
    expect(screen.getByText('2 Teile')).toBeInTheDocument();
  });

  it('shows the full detail of an outfit when viewing it', async () => {
    mockApiFetch.mockResolvedValueOnce([outfit]);
    renderOutfits();
    await screen.findByText('Abend-Look');

    fireEvent.click(screen.getByRole('button', { name: 'Abend-Look ansehen' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Rotes Kleid')).toBeInTheDocument();
    expect(within(dialog).getByText('Goldene Schuhe')).toBeInTheDocument();
    expect(within(dialog).getByText('kleid')).toBeInTheDocument();
  });

  it('deletes an outfit after confirmation and updates the list', async () => {
    mockApiFetch.mockResolvedValueOnce([outfit]);
    mockApiFetch.mockResolvedValueOnce(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderOutfits();
    await screen.findByText('Abend-Look');

    fireEvent.click(screen.getByRole('button', { name: 'Abend-Look löschen' }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/outfits/10', {
        method: 'DELETE',
      });
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(await screen.findByText(/Noch keine Outfits/)).toBeInTheDocument();
  });
});
